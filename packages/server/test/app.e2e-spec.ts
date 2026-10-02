import request from "supertest"
import { createTestApp, test } from "./fixtures.js"

describe("AppController (e2e)", () => {
  describe("GET /api/health", () => {
    test("200 without session", async ({ anonymous }) => {
      await anonymous.get("/api/health").expect(200).expect({ up: true })
    })
  })

  // El ThrottlerGuard es global: se testea una vez aquí con el límite real.
  describe("ThrottlerGuard", () => {
    test("429 after more than 3 requests in a second", async ({
      fetch,
      onTestFinished,
    }) => {
      const app = await createTestApp({ fetch, throttle: true })
      onTestFinished(() => app.close())
      const server = request(app.getHttpServer())

      for (let i = 0; i < 3; i++) {
        await server.get("/api/health").expect(200)
      }

      const response = await server.get("/api/health").expect(429)
      expect(response.body).toMatchObject({ statusCode: 429 })
    })
  })
})
