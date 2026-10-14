import { randomUUID } from "node:crypto"
import { add, startOfDay, sub } from "date-fns"
import { db } from "../src/db/index.js"
import { check } from "../src/db/schema.js"
import { checkSchema } from "../src/monitors/checks/dto/check.dto.js"
import {
  FIND_ALL_PAGE_SIZE,
  findAllChecksSchema,
} from "../src/monitors/checks/dto/find-all.dto.js"
import { checkStatListSchema } from "../src/monitors/checks/dto/find-check.dto.js"
import { notFoundSchema } from "../src/shared/not-found-error.js"
import { createMonitor, test } from "./fixtures.js"

// Guarda un check con la fecha indicada sin pasar por la API.
async function insertCheck(
  monitorId: string,
  checkedAt: Date | string,
  { isUp = true, responseTimeMs = 10 } = {},
) {
  const [inserted] = await db
    .insert(check)
    .values({
      monitorId,
      isUp,
      statusCode: isUp ? 200 : 500,
      responseTimeMs,
      checkedAt:
        typeof checkedAt === "string" ? checkedAt : checkedAt.toISOString(),
    })
    .returning()

  return inserted
}

function ids(page: { data: { id: string }[] }) {
  return page.data.map(({ id }) => id)
}

describe("ChecksController (e2e)", () => {
  describe("GET /api/monitors/:monitorId/checks", () => {
    test("200 with the first page of checks, newest first", async ({
      user,
    }) => {
      const monitor = await createMonitor(user)
      const now = new Date()
      const older = await insertCheck(monitor.id, sub(now, { days: 10 }))
      const newer = await insertCheck(monitor.id, sub(now, { hours: 1 }))

      const response = await user.agent
        .get(`/api/monitors/${monitor.id}/checks`)
        .expect(200)

      expect(response.body).toEqual(expect.schemaMatching(findAllChecksSchema))
      expect(ids(response.body)).toEqual([newer?.id, older?.id])
      expect(response.body.meta).toEqual({ nextCursor: null, size: 2 })
    })

    test("200 with an empty page when the monitor has no checks", async ({
      user,
    }) => {
      const monitor = await createMonitor(user)

      const response = await user.agent
        .get(`/api/monitors/${monitor.id}/checks`)
        .expect(200)

      expect(response.body).toEqual({
        data: [],
        meta: { nextCursor: null, size: 0 },
      })
    })

    test("200 with every check across pages, without repeating any", async ({
      user,
    }) => {
      const monitor = await createMonitor(user)
      const now = new Date()
      const inserted = []
      for (let i = 0; i < FIND_ALL_PAGE_SIZE + 5; i++) {
        inserted.push(await insertCheck(monitor.id, sub(now, { minutes: i })))
      }

      const first = await user.agent
        .get(`/api/monitors/${monitor.id}/checks`)
        .expect(200)
      expect(first.body.meta.size).toBe(FIND_ALL_PAGE_SIZE)
      expect(first.body.meta.nextCursor).toEqual(expect.any(String))

      const second = await user.agent
        .get(`/api/monitors/${monitor.id}/checks`)
        .query({ cursor: first.body.meta.nextCursor })
        .expect(200)
      expect(second.body.meta).toEqual({ nextCursor: null, size: 5 })

      expect([...ids(first.body), ...ids(second.body)]).toEqual(
        inserted.map((check) => check?.id),
      )
    })

    test("200 without losing checks whose checkedAt has microseconds", async ({
      user,
    }) => {
      // Postgres guarda `timestamptz` con microsegundos (como `defaultNow()`
      // al ejecutar un monitor), más precisión que un `Date` de JavaScript.
      const monitor = await createMonitor(user)
      const inserted = []
      for (let i = 0; i <= FIND_ALL_PAGE_SIZE; i++) {
        const second = String(59 - i).padStart(2, "0")
        inserted.push(
          await insertCheck(monitor.id, `2026-09-30T00:00:${second}.123456Z`),
        )
      }

      const first = await user.agent
        .get(`/api/monitors/${monitor.id}/checks`)
        .expect(200)
      const second = await user.agent
        .get(`/api/monitors/${monitor.id}/checks`)
        .query({ cursor: first.body.meta.nextCursor })
        .expect(200)

      expect([...ids(first.body), ...ids(second.body)]).toEqual(
        inserted.map((check) => check?.id),
      )
    })

    test("200 with an empty page when the monitor does not exist", async ({
      user,
    }) => {
      const response = await user.agent
        .get(`/api/monitors/${randomUUID()}/checks`)
        .expect(200)

      expect(response.body).toEqual({
        data: [],
        meta: { nextCursor: null, size: 0 },
      })
    })

    test("200 without the checks when the monitor belongs to another user", async ({
      user,
      otherUser,
    }) => {
      const monitor = await createMonitor(otherUser)
      await insertCheck(monitor.id, new Date())

      const response = await user.agent
        .get(`/api/monitors/${monitor.id}/checks`)
        .expect(200)

      expect(response.body).toEqual({
        data: [],
        meta: { nextCursor: null, size: 0 },
      })
    })

    test("400 when the id is not a uuid", async ({ user }) => {
      await user.agent.get("/api/monitors/not-a-uuid/checks").expect(400)
    })

    test("400 when the cursor is not base64url", async ({ user }) => {
      const monitor = await createMonitor(user)

      await user.agent
        .get(`/api/monitors/${monitor.id}/checks`)
        .query({ cursor: "not base64!" })
        .expect(400)
    })

    test("400 when the cursor does not hold a valid position", async ({
      user,
    }) => {
      const monitor = await createMonitor(user)
      const cursor = Buffer.from(JSON.stringify({ id: "1" })).toString(
        "base64url",
      )

      await user.agent
        .get(`/api/monitors/${monitor.id}/checks`)
        .query({ cursor })
        .expect(400)
    })

    test("401 without session", async ({ anonymous }) => {
      await anonymous.get(`/api/monitors/${randomUUID()}/checks`).expect(401)
    })
  })

  describe("GET /api/monitors/:monitorId/checks/stats", () => {
    test.for(["today", "week", "month", "year"])(
      "200 with the checks of the current %s grouped by interval",
      async (detail, { user }) => {
        const monitor = await createMonitor(user)
        const dayStart = startOfDay(new Date())
        await insertCheck(monitor.id, sub(dayStart, { years: 2 }))
        await insertCheck(monitor.id, add(dayStart, { seconds: 1 }), {
          responseTimeMs: 10,
        })
        await insertCheck(monitor.id, add(dayStart, { seconds: 2 }), {
          isUp: false,
          responseTimeMs: 30,
        })

        const response = await user.agent
          .get(`/api/monitors/${monitor.id}/checks/stats`)
          .query({ detail })
          .expect(200)

        expect(response.body).toEqual(
          expect.schemaMatching(checkStatListSchema),
        )
        expect(response.body).toEqual([
          expect.objectContaining({
            isUp: false,
            responseTimeMs: 20,
            minResponseTimeMs: 10,
            maxResponseTimeMs: 30,
            checks: 2,
            upChecks: 1,
          }),
        ])
      },
    )

    test("200 with the intervals of today every 15 minutes, newest first", async ({
      user,
    }) => {
      const monitor = await createMonitor(user)
      const dayStart = startOfDay(new Date())
      await insertCheck(monitor.id, add(dayStart, { minutes: 1 }))
      await insertCheck(monitor.id, add(dayStart, { minutes: 20 }))

      const response = await user.agent
        .get(`/api/monitors/${monitor.id}/checks/stats`)
        .expect(200)

      expect(
        response.body.map(({ checkedAt }: { checkedAt: string }) => checkedAt),
      ).toEqual([
        add(dayStart, { minutes: 15 }).toISOString(),
        dayStart.toISOString(),
      ])
    })

    test("200 with an empty list when the monitor has no checks", async ({
      user,
    }) => {
      const monitor = await createMonitor(user)

      const response = await user.agent
        .get(`/api/monitors/${monitor.id}/checks/stats`)
        .query({ detail: "year" })
        .expect(200)

      expect(response.body).toEqual([])
    })

    test("400 when the id is not a uuid", async ({ user }) => {
      await user.agent.get("/api/monitors/not-a-uuid/checks/stats").expect(400)
    })

    test("400 when detail is invalid", async ({ user }) => {
      const monitor = await createMonitor(user)

      await user.agent
        .get(`/api/monitors/${monitor.id}/checks/stats`)
        .query({ detail: "decade" })
        .expect(400)
    })

    test("401 without session", async ({ anonymous }) => {
      await anonymous
        .get(`/api/monitors/${randomUUID()}/checks/stats`)
        .expect(401)
    })

    test("404 when the monitor does not exist", async ({ user }) => {
      const response = await user.agent
        .get(`/api/monitors/${randomUUID()}/checks/stats`)
        .query({ detail: "today" })
        .expect(404)

      expect(response.body).toEqual(expect.schemaMatching(notFoundSchema))
    })

    test("404 when the monitor belongs to another user", async ({
      user,
      otherUser,
    }) => {
      const monitor = await createMonitor(otherUser)
      await insertCheck(monitor.id, new Date())

      const response = await user.agent
        .get(`/api/monitors/${monitor.id}/checks/stats`)
        .query({ detail: "today" })
        .expect(404)

      expect(response.body).toEqual(expect.schemaMatching(notFoundSchema))
    })
  })

  describe("POST /api/monitors/:monitorId/checks", () => {
    test("201 with the new check", async ({ user, fetch }) => {
      const monitor = await createMonitor(user)
      fetch.mockResolvedValueOnce(new Response(null, { status: 200 }))

      const response = await user.agent
        .post(`/api/monitors/${monitor.id}/checks`)
        .expect(201)

      expect(response.body).toEqual(expect.schemaMatching(checkSchema))
      expect(response.body).toMatchObject({ isUp: true, statusCode: 200 })
      expect(response.body).not.toHaveProperty("monitorId")

      const checks = await user.agent
        .get(`/api/monitors/${monitor.id}/checks`)
        .expect(200)
      expect(ids(checks.body)).toEqual([response.body.id])
    })

    test("400 when the id is not a uuid", async ({ user }) => {
      await user.agent.post("/api/monitors/not-a-uuid/checks").expect(400)
    })

    test("401 without session", async ({ anonymous }) => {
      await anonymous.post(`/api/monitors/${randomUUID()}/checks`).expect(401)
    })

    test("404 when the monitor does not exist", async ({ user }) => {
      const response = await user.agent
        .post(`/api/monitors/${randomUUID()}/checks`)
        .expect(404)

      expect(response.body).toEqual(expect.schemaMatching(notFoundSchema))
    })

    test("404 and no check when the monitor belongs to another user", async ({
      user,
      otherUser,
    }) => {
      const monitor = await createMonitor(otherUser)

      const response = await user.agent
        .post(`/api/monitors/${monitor.id}/checks`)
        .expect(404)

      expect(response.body).toEqual(expect.schemaMatching(notFoundSchema))
      const ownerView = await otherUser.agent
        .get(`/api/monitors/${monitor.id}/checks/stats`)
        .query({ detail: "today" })
        .expect(200)
      expect(ownerView.body).toEqual([])
    })
  })
})
