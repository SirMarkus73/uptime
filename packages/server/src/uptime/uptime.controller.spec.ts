import { Test } from "@nestjs/testing"
import { test as baseTest } from "vitest"
import { CheckStateResultDto } from "./dto/check-state.dto.js"
import { UptimeController } from "./uptime.controller.js"
import { UptimeService } from "./uptime.service.js"

const test = baseTest
  .extend("checkState", () => vi.fn<UptimeService["checkState"]>())
  .extend("controller", async ({ checkState }) => {
    const module = await Test.createTestingModule({
      controllers: [UptimeController],
      providers: [{ provide: UptimeService, useValue: { checkState } }],
    }).compile()

    return module.get(UptimeController)
  })

describe("UptimeController", () => {
  test("should be defined", ({ controller }) => {
    expect(controller).toBeDefined()
  })

  test("delegates the url to UptimeService.checkState", async ({
    checkState,
    controller,
  }) => {
    const state: CheckStateResultDto = {
      isUp: true,
      statusCode: 200,
      responseTimeMs: 42,
      errorCode: null,
      checkedAt: new Date().toISOString(),
    }
    checkState.mockResolvedValueOnce(state)

    const result = await controller.checkUrl({ url: "https://example.com" })

    expect(checkState).toHaveBeenCalledExactlyOnceWith("https://example.com")
    expect(result).toEqual(state)
  })

  test("returns the 'down' state from the service", async ({
    checkState,
    controller,
  }) => {
    const state: CheckStateResultDto = {
      isUp: false,
      statusCode: null,
      responseTimeMs: 10,
      errorCode: "ENOTFOUND",
      checkedAt: new Date().toISOString(),
    }
    checkState.mockResolvedValueOnce(state)

    const result = await controller.checkUrl({ url: "https://example.invalid" })

    expect(result).toEqual(state)
  })
})
