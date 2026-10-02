import { checkStateResultSchema } from "../src/uptime/dto/check-state.dto.js"
import { test } from "./fixtures.js"

describe("UptimeController (e2e)", () => {
  describe("GET /api/uptime", () => {
    test("200 without session, with the state of the url", async ({
      anonymous,
      fetch,
    }) => {
      fetch.mockResolvedValueOnce(new Response(null, { status: 503 }))

      const response = await anonymous
        .get("/api/uptime")
        .query({ url: "https://example.com" })
        .expect(200)

      expect(response.body).toEqual(
        expect.schemaMatching(checkStateResultSchema),
      )
      expect(response.body).toMatchObject({ isUp: false, statusCode: 503 })
    })

    test("400 when the url is missing", async ({ anonymous }) => {
      const response = await anonymous.get("/api/uptime").expect(400)

      expect(response.body).toMatchObject({ statusCode: 400 })
    })

    test("400 when the url is not http(s)", async ({ anonymous }) => {
      const response = await anonymous
        .get("/api/uptime")
        .query({ url: "ftp://example.com" })
        .expect(400)

      expect(response.body).toMatchObject({ statusCode: 400 })
    })
  })
})
