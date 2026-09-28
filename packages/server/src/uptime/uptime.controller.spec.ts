import { Test, TestingModule } from "@nestjs/testing"
import { checkStateDto } from "./dto/check-state.dto.js"
import { UptimeController } from "./uptime.controller.js"
import { UptimeService } from "./uptime.service.js"

describe("UptimeController", () => {
  let controller: UptimeController
  const checkState = vi.fn<UptimeService["checkState"]>()

  beforeEach(async () => {
    checkState.mockReset()
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UptimeController],
      providers: [{ provide: UptimeService, useValue: { checkState } }],
    }).compile()

    controller = module.get<UptimeController>(UptimeController)
  })

  it("should be defined", () => {
    expect(controller).toBeDefined()
  })

  it("delegates the url to UptimeService.checkState", async () => {
    const state: checkStateDto = {
      isUp: true,
      statusCode: 200,
      responseTimeMs: 42,
      fetchError: null,
      checkedAt: new Date().toISOString(),
    }
    checkState.mockResolvedValueOnce(state)

    const result = await controller.checkUrl({ url: "https://example.com" })

    expect(checkState).toHaveBeenCalledExactlyOnceWith("https://example.com")
    expect(result).toEqual(state)
  })

  it("returns the 'down' state from the service", async () => {
    const state: checkStateDto = {
      isUp: false,
      statusCode: null,
      responseTimeMs: 10,
      fetchError: "ENOTFOUND",
      checkedAt: new Date().toISOString(),
    }
    checkState.mockResolvedValueOnce(state)

    const result = await controller.checkUrl({ url: "https://example.invalid" })

    expect(result).toEqual(state)
  })
})