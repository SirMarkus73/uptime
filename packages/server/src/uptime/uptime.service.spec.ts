import { HttpClientModule, HttpNetworkError } from "@nestjs/http-client"
import { Test, TestingModule } from "@nestjs/testing"
import { UptimeModule } from "./uptime.module.js"
import { UptimeService } from "./uptime.service.js"

describe("UptimeService", () => {
  const fetch = vi.fn<typeof global.fetch>()
  let service: UptimeService

  beforeEach(async () => {
    fetch.mockReset()
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpClientModule.forRoot({ fetch }), UptimeModule],
    }).compile()

    service = module.get<UptimeService>(UptimeService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  it("returns 'up', when 200", async () => {
    fetch.mockResolvedValueOnce(Response.json("works"))

    const result = await service.checkState("https://example.com")

    expect(result.isUp).toBe(true)
    expect(result.statusCode).toBe(200)
    expect(result.responseTimeMs).toBeTypeOf("number")
    expect(result.fetchError).toBeNull()
    expect(result.checkedAt).toBeTypeOf("string")
  })

  it("returns 'down', when 500 (HttpResponseError)", async () => {
    fetch.mockResolvedValueOnce(Response.json(null, { status: 500 }))

    const result = await service.checkState("https://example.com")

    expect(result.isUp).toBe(false)
    expect(result.statusCode).toBe(500)
    expect(result.responseTimeMs).toBeTypeOf("number")
    expect(result.fetchError).toBeNull()
    expect(result.checkedAt).toBeTypeOf("string")
  })

  it("returns 'down' when DNS does not resolve", async () => {
    fetch.mockRejectedValueOnce(
      Object.assign(
        new HttpNetworkError({
          method: "HEAD",
          url: "https://example.com",
          cause: {
            code: "ENOTFOUND",
          },
        }),
      ),
    )

    const result = await service.checkState("https://example.com")

    expect(result.isUp).toBe(false)
    expect(result.statusCode).toBeNull()
    expect(result.responseTimeMs).toBeTypeOf("number")
    expect(result.fetchError).toBe("ENOTFOUND")
    expect(result.checkedAt).toBeTypeOf("string")
  })

  it("returns 'down' when connection refuses", async () => {
    fetch.mockRejectedValueOnce(
      Object.assign(
        new HttpNetworkError({
          method: "HEAD",
          url: "https://example.com",
          cause: {
            code: "ECONNREFUSED",
          },
        }),
      ),
    )

    const result = await service.checkState("https://example.com")

    expect(result.isUp).toBe(false)
    expect(result.statusCode).toBeNull()
    expect(result.responseTimeMs).toBeTypeOf("number")
    expect(result.fetchError).toBe("ECONNREFUSED")
    expect(result.checkedAt).toBeTypeOf("string")
  })
})
