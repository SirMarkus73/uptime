import { HttpClientModule, HttpNetworkError } from "@nestjs/http-client"
import { Test } from "@nestjs/testing"
import { test as baseTest } from "vitest"
import { checkStateResultSchema } from "./dto/check-state.dto.js"
import { UptimeModule } from "./uptime.module.js"
import { UptimeService } from "./uptime.service.js"

const test = baseTest
  .extend("fetch", () => vi.fn<typeof global.fetch>())
  .extend("service", async ({ fetch }) => {
    const module = await Test.createTestingModule({
      imports: [HttpClientModule.forRoot({ fetch }), UptimeModule],
    }).compile()

    return module.get(UptimeService)
  })

describe("UptimeService", () => {
  test("should be defined", ({ service }) => {
    expect(service).toBeDefined()
  })

  test("returns 'up', when 200", async ({ fetch, service }) => {
    fetch.mockResolvedValueOnce(Response.json("works"))

    const result = await service.checkState("https://example.com")

    expect(result).toEqual(expect.schemaMatching(checkStateResultSchema))
    expect(result).toMatchObject({
      isUp: true,
      statusCode: 200,
      errorCode: null,
    })
  })

  test("returns 'down', when 500 (HttpResponseError)", async ({
    fetch,
    service,
  }) => {
    fetch.mockResolvedValueOnce(Response.json(null, { status: 500 }))

    const result = await service.checkState("https://example.com")

    expect(result).toEqual(expect.schemaMatching(checkStateResultSchema))
    expect(result).toMatchObject({
      isUp: false,
      statusCode: 500,
      errorCode: null,
    })
  })

  test("returns 'down' when DNS does not resolve", async ({
    fetch,
    service,
  }) => {
    fetch.mockRejectedValueOnce(
      new HttpNetworkError({
        method: "HEAD",
        url: "https://example.com",
        cause: {
          code: "ENOTFOUND",
        },
      }),
    )

    const result = await service.checkState("https://example.com")

    expect(result).toEqual(expect.schemaMatching(checkStateResultSchema))
    expect(result).toMatchObject({
      isUp: false,
      statusCode: null,
      errorCode: "ENOTFOUND",
    })
  })

  test("returns 'down' when connection refuses", async ({ fetch, service }) => {
    fetch.mockRejectedValueOnce(
      new HttpNetworkError({
        method: "HEAD",
        url: "https://example.com",
        cause: {
          code: "ECONNREFUSED",
        },
      }),
    )

    const result = await service.checkState("https://example.com")

    expect(result).toEqual(expect.schemaMatching(checkStateResultSchema))
    expect(result).toMatchObject({
      isUp: false,
      statusCode: null,
      errorCode: "ECONNREFUSED",
    })
  })

  test("returns 'TIMEOUT' when the page takes more than 10s to answer", async ({
    fetch,
    service,
    onTestFinished,
  }) => {
    vi.useFakeTimers()
    onTestFinished(() => {
      vi.useRealTimers()
    })
    // Like the real fetch: never settles until the request signal aborts
    fetch.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          )
        }),
    )

    const pending = service.checkState("https://example.com")
    await vi.advanceTimersByTimeAsync(10_000)
    const result = await pending

    expect(result).toEqual(expect.schemaMatching(checkStateResultSchema))
    expect(result).toMatchObject({
      isUp: false,
      statusCode: null,
      errorCode: "TIMEOUT",
    })
  })
})
