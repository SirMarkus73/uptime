import { randomUUID } from "node:crypto"
import {
  monitorDetailSchema,
  monitorListSchema,
} from "../src/monitors/dto/monitor.dto.js"
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
        webPage: "https://example.com",
        ownedBy: user.id,
        checks: [],
      })
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
        expect.objectContaining({ id: own.id, isUp: null }),
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
      expect(response.body).toMatchObject({ id: monitor.id, checks: [] })
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

  describe("POST /api/monitors/:monitorId/run", () => {
    test("201 with the new check first", async ({ user, fetch }) => {
      const monitor = await createMonitor(user)
      fetch.mockResolvedValueOnce(new Response(null, { status: 200 }))

      const response = await user.agent
        .post(`/api/monitors/${monitor.id}/run`)
        .expect(201)

      expect(response.body).toEqual(expect.schemaMatching(monitorDetailSchema))
      expect(response.body.checks).toEqual([
        expect.objectContaining({ isUp: true, statusCode: 200 }),
      ])
    })

    test("400 when the id is not a uuid", async ({ user }) => {
      await user.agent.post("/api/monitors/not-a-uuid/run").expect(400)
    })

    test("401 without session", async ({ anonymous }) => {
      await anonymous.post(`/api/monitors/${randomUUID()}/run`).expect(401)
    })

    test("404 when the monitor does not exist", async ({ user }) => {
      const response = await user.agent
        .post(`/api/monitors/${randomUUID()}/run`)
        .expect(404)

      expect(response.body).toEqual(expect.schemaMatching(notFoundSchema))
    })

    test("404 and no check when the monitor belongs to another user", async ({
      user,
      otherUser,
    }) => {
      const monitor = await createMonitor(otherUser)

      const response = await user.agent
        .post(`/api/monitors/${monitor.id}/run`)
        .expect(404)

      expect(response.body).toEqual(expect.schemaMatching(notFoundSchema))
      const ownerView = await otherUser.agent
        .get(`/api/monitors/${monitor.id}`)
        .expect(200)
      expect(ownerView.body.checks).toEqual([])
    })
  })

  describe("DELETE /api/monitors/:monitorId", () => {
    test("204 and the monitor is gone", async ({ user }) => {
      const monitor = await createMonitor(user)

      await user.agent.delete(`/api/monitors/${monitor.id}`).expect(204)

      await user.agent.get(`/api/monitors/${monitor.id}`).expect(404)
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
})
