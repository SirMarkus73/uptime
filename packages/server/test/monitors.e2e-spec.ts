import { randomUUID } from "node:crypto"
import { db } from "../src/db/index.js"
import {
  monitorDetailSchema,
  monitorListSchema,
} from "../src/monitors/dto/monitor.dto.js"
import { monitorSchedulerId } from "../src/monitors/monitors.queue.js"
import { notFoundSchema } from "../src/shared/not-found-error.js"
import { createMonitor, test } from "./fixtures.js"

describe("MonitorsController (e2e)", () => {
  describe("POST /api/monitors", () => {
    test("201 with the monitor owned by the session user", async ({ user }) => {
      const response = await user.agent
        .post("/api/monitors")
        .send({ name: "Example", webPage: "https://example.com" })
        .expect(201)

      expect(response.body).toEqual(expect.schemaMatching(monitorDetailSchema))
      expect(response.body).toMatchObject({
        name: "Example",
        webPage: "https://example.com/",
        ownedBy: user.id,
        lastCheck: null,
        hasScheduler: true,
      })
    })

    test("201 scheduling the monitor with its execution interval", async ({
      user,
      monitorsQueue,
    }) => {
      const response = await user.agent
        .post("/api/monitors")
        .send({
          name: "Example",
          webPage: "https://example.com",
          executeEveryMinutes: 10,
        })
        .expect(201)

      const scheduler = await monitorsQueue.getJobScheduler(
        monitorSchedulerId(response.body.id),
      )
      expect(scheduler).toMatchObject({
        every: 10 * 60 * 1000,
        template: { data: { monitorId: response.body.id } },
      })
    })

    test("201 scheduling every 5 minutes when the interval is omitted", async ({
      user,
      monitorsQueue,
    }) => {
      const response = await user.agent
        .post("/api/monitors")
        .send({ name: "Example", webPage: "https://example.com" })
        .expect(201)

      const scheduler = await monitorsQueue.getJobScheduler(
        monitorSchedulerId(response.body.id),
      )
      expect(scheduler).toMatchObject({ every: 5 * 60 * 1000 })
    })

    test("201 normalizing the scheme and host without touching path or query", async ({
      user,
    }) => {
      const response = await user.agent
        .post("/api/monitors")
        .send({
          name: "Example",
          webPage: "HTTPS://Example.COM/Docs?token=AbC",
        })
        .expect(201)

      expect(response.body).toMatchObject({
        webPage: "https://example.com/Docs?token=AbC",
      })
    })

    test("201 saving the execution interval", async ({ user }) => {
      const response = await user.agent
        .post("/api/monitors")
        .send({
          name: "Example",
          webPage: "https://example.com",
          executeEveryMinutes: 10,
        })
        .expect(201)

      const saved = await db.query.monitor.findFirst({
        where: { id: response.body.id },
      })
      expect(saved).toMatchObject({ executeEveryMinutes: 10 })
    })

    test("201 executing every 5 minutes when the interval is omitted", async ({
      user,
    }) => {
      const response = await user.agent
        .post("/api/monitors")
        .send({ name: "Example", webPage: "https://example.com" })
        .expect(201)

      const saved = await db.query.monitor.findFirst({
        where: { id: response.body.id },
      })
      expect(saved).toMatchObject({ executeEveryMinutes: 5 })
    })

    test("400 when the execution interval is below 5 minutes", async ({
      user,
    }) => {
      const response = await user.agent
        .post("/api/monitors")
        .send({
          name: "Example",
          webPage: "https://example.com",
          executeEveryMinutes: 4,
        })
        .expect(400)

      expect(response.body).toMatchObject({ statusCode: 400 })
    })

    test("400 when the execution interval is not an integer", async ({
      user,
    }) => {
      const response = await user.agent
        .post("/api/monitors")
        .send({
          name: "Example",
          webPage: "https://example.com",
          executeEveryMinutes: 7.5,
        })
        .expect(400)

      expect(response.body).toMatchObject({ statusCode: 400 })
    })

    test("400 when the url is not valid", async ({ user }) => {
      const response = await user.agent
        .post("/api/monitors")
        .send({ name: "Example", webPage: "not-a-url" })
        .expect(400)

      expect(response.body).toMatchObject({ statusCode: 400 })
    })

    test("400 when the name is missing", async ({ user }) => {
      const response = await user.agent
        .post("/api/monitors")
        .send({ webPage: "https://example.com" })
        .expect(400)

      expect(response.body).toMatchObject({ statusCode: 400 })
    })

    test("401 without session", async ({ anonymous }) => {
      await anonymous
        .post("/api/monitors")
        .send({ name: "Example", webPage: "https://example.com" })
        .expect(401)
    })
  })

  describe("GET /api/monitors", () => {
    test("200 with only the monitors of the session user", async ({
      user,
      otherUser,
    }) => {
      const own = await createMonitor(user)
      await createMonitor(otherUser)

      const response = await user.agent.get("/api/monitors").expect(200)

      expect(response.body).toEqual(expect.schemaMatching(monitorListSchema))
      expect(response.body).toEqual([
        expect.objectContaining({ id: own.id, lastCheck: null }),
      ])
    })

    test("200 with the last check of each monitor", async ({ user, fetch }) => {
      const monitor = await createMonitor(user)
      fetch.mockResolvedValueOnce(new Response(null, { status: 503 }))
      const { body: createdCheck } = await user.agent
        .post(`/api/monitors/${monitor.id}/checks`)
        .expect(201)

      const response = await user.agent.get("/api/monitors").expect(200)

      expect(response.body).toEqual(expect.schemaMatching(monitorListSchema))
      expect(response.body).toEqual([
        expect.objectContaining({ id: monitor.id, lastCheck: createdCheck }),
      ])
    })

    test("401 without session", async ({ anonymous }) => {
      await anonymous.get("/api/monitors").expect(401)
    })
  })

  describe("GET /api/monitors/:monitorId", () => {
    test("200 with the monitor", async ({ user }) => {
      const monitor = await createMonitor(user)

      const response = await user.agent
        .get(`/api/monitors/${monitor.id}`)
        .expect(200)

      expect(response.body).toEqual(expect.schemaMatching(monitorDetailSchema))
      expect(response.body).toMatchObject({
        id: monitor.id,
        executeEveryMinutes: 5,
        lastCheck: null,
        hasScheduler: true,
      })
    })

    test("200 with hasScheduler false when the scheduler is paused", async ({
      user,
    }) => {
      const monitor = await createMonitor(user)
      await user.agent
        .delete(`/api/monitors/${monitor.id}/scheduler`)
        .expect(204)

      const response = await user.agent
        .get(`/api/monitors/${monitor.id}`)
        .expect(200)

      expect(response.body).toMatchObject({ hasScheduler: false })
    })

    test("200 with the last check, without the fields the schema does not declare", async ({
      user,
    }) => {
      const monitor = await createMonitor(user)
      const { body: createdCheck } = await user.agent
        .post(`/api/monitors/${monitor.id}/checks`)
        .expect(201)

      const response = await user.agent
        .get(`/api/monitors/${monitor.id}`)
        .expect(200)

      expect(response.body).toEqual(expect.schemaMatching(monitorDetailSchema))
      expect(response.body.lastCheck).toEqual(createdCheck)
      expect(response.body.lastCheck).not.toHaveProperty("monitorId")
    })

    test("400 when the id is not a uuid", async ({ user }) => {
      await user.agent.get("/api/monitors/not-a-uuid").expect(400)
    })

    test("401 without session", async ({ anonymous }) => {
      await anonymous.get(`/api/monitors/${randomUUID()}`).expect(401)
    })

    test("404 when the monitor does not exist", async ({ user }) => {
      const response = await user.agent
        .get(`/api/monitors/${randomUUID()}`)
        .expect(404)

      expect(response.body).toEqual(expect.schemaMatching(notFoundSchema))
    })

    test("404 when the monitor belongs to another user", async ({
      user,
      otherUser,
    }) => {
      const monitor = await createMonitor(otherUser)

      const response = await user.agent
        .get(`/api/monitors/${monitor.id}`)
        .expect(404)

      expect(response.body).toEqual(expect.schemaMatching(notFoundSchema))
    })
  })

  describe("DELETE /api/monitors/:monitorId", () => {
    test("204 and the monitor and its scheduler are gone", async ({
      user,
      monitorsQueue,
    }) => {
      const monitor = await createMonitor(user)

      await user.agent.delete(`/api/monitors/${monitor.id}`).expect(204)

      await user.agent.get(`/api/monitors/${monitor.id}`).expect(404)
      await expect(
        monitorsQueue.getJobScheduler(monitorSchedulerId(monitor.id)),
      ).resolves.toBeUndefined()
    })

    test("400 when the id is not a uuid", async ({ user }) => {
      await user.agent.delete("/api/monitors/not-a-uuid").expect(400)
    })

    test("401 without session", async ({ anonymous }) => {
      await anonymous.delete(`/api/monitors/${randomUUID()}`).expect(401)
    })

    test("404 when the monitor does not exist", async ({ user }) => {
      const response = await user.agent
        .delete(`/api/monitors/${randomUUID()}`)
        .expect(404)

      expect(response.body).toEqual(expect.schemaMatching(notFoundSchema))
    })

    test("404 and the monitor is kept when it belongs to another user", async ({
      user,
      otherUser,
    }) => {
      const monitor = await createMonitor(otherUser)

      const response = await user.agent
        .delete(`/api/monitors/${monitor.id}`)
        .expect(404)

      expect(response.body).toEqual(expect.schemaMatching(notFoundSchema))
      await otherUser.agent.get(`/api/monitors/${monitor.id}`).expect(200)
    })
  })

  describe("POST /api/monitors/:monitorId/scheduler", () => {
    test("204 and the paused monitor is scheduled again", async ({
      user,
      monitorsQueue,
    }) => {
      const monitor = await createMonitor(user)
      await user.agent
        .delete(`/api/monitors/${monitor.id}/scheduler`)
        .expect(204)

      await user.agent.post(`/api/monitors/${monitor.id}/scheduler`).expect(204)

      const response = await user.agent
        .get(`/api/monitors/${monitor.id}`)
        .expect(200)
      expect(response.body).toMatchObject({ hasScheduler: true })
      await expect(
        monitorsQueue.getJobScheduler(monitorSchedulerId(monitor.id)),
      ).resolves.toMatchObject({ every: 5 * 60 * 1000 })
    })

    test("204 when the scheduler is already active", async ({ user }) => {
      const monitor = await createMonitor(user)

      await user.agent.post(`/api/monitors/${monitor.id}/scheduler`).expect(204)

      const response = await user.agent
        .get(`/api/monitors/${monitor.id}`)
        .expect(200)
      expect(response.body).toMatchObject({ hasScheduler: true })
    })

    test("400 when the id is not a uuid", async ({ user }) => {
      await user.agent.post("/api/monitors/not-a-uuid/scheduler").expect(400)
    })

    test("401 without session", async ({ anonymous }) => {
      await anonymous
        .post(`/api/monitors/${randomUUID()}/scheduler`)
        .expect(401)
    })

    test("404 when the monitor does not exist", async ({ user }) => {
      const response = await user.agent
        .post(`/api/monitors/${randomUUID()}/scheduler`)
        .expect(404)

      expect(response.body).toEqual(expect.schemaMatching(notFoundSchema))
    })

    test("404 and the scheduler stays paused when the monitor belongs to another user", async ({
      user,
      otherUser,
    }) => {
      const monitor = await createMonitor(otherUser)
      await otherUser.agent
        .delete(`/api/monitors/${monitor.id}/scheduler`)
        .expect(204)

      const response = await user.agent
        .post(`/api/monitors/${monitor.id}/scheduler`)
        .expect(404)

      expect(response.body).toEqual(expect.schemaMatching(notFoundSchema))
      const ownerView = await otherUser.agent
        .get(`/api/monitors/${monitor.id}`)
        .expect(200)
      expect(ownerView.body).toMatchObject({ hasScheduler: false })
    })
  })

  describe("DELETE /api/monitors/:monitorId/scheduler", () => {
    test("204 and the monitor is no longer scheduled", async ({
      user,
      monitorsQueue,
    }) => {
      const monitor = await createMonitor(user)

      await user.agent
        .delete(`/api/monitors/${monitor.id}/scheduler`)
        .expect(204)

      await expect(
        monitorsQueue.getJobScheduler(monitorSchedulerId(monitor.id)),
      ).resolves.toBeUndefined()
    })

    test("204 when the scheduler is already paused", async ({ user }) => {
      const monitor = await createMonitor(user)
      await user.agent
        .delete(`/api/monitors/${monitor.id}/scheduler`)
        .expect(204)

      await user.agent
        .delete(`/api/monitors/${monitor.id}/scheduler`)
        .expect(204)

      const response = await user.agent
        .get(`/api/monitors/${monitor.id}`)
        .expect(200)
      expect(response.body).toMatchObject({ hasScheduler: false })
    })

    test("400 when the id is not a uuid", async ({ user }) => {
      await user.agent.delete("/api/monitors/not-a-uuid/scheduler").expect(400)
    })

    test("401 without session", async ({ anonymous }) => {
      await anonymous
        .delete(`/api/monitors/${randomUUID()}/scheduler`)
        .expect(401)
    })

    test("404 when the monitor does not exist", async ({ user }) => {
      const response = await user.agent
        .delete(`/api/monitors/${randomUUID()}/scheduler`)
        .expect(404)

      expect(response.body).toEqual(expect.schemaMatching(notFoundSchema))
    })

    test("404 and the scheduler is kept when the monitor belongs to another user", async ({
      user,
      otherUser,
    }) => {
      const monitor = await createMonitor(otherUser)

      const response = await user.agent
        .delete(`/api/monitors/${monitor.id}/scheduler`)
        .expect(404)

      expect(response.body).toEqual(expect.schemaMatching(notFoundSchema))
      const ownerView = await otherUser.agent
        .get(`/api/monitors/${monitor.id}`)
        .expect(200)
      expect(ownerView.body).toMatchObject({ hasScheduler: true })
    })
  })
})
