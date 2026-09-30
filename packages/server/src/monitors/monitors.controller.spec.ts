import { Test, TestingModule } from "@nestjs/testing"
import { UptimeModule } from "../uptime/uptime.module.js"
import { MonitorsController } from "./monitors.controller.js"
import { MonitorsService } from "./monitors.service.js"

describe("MonitorsController", () => {
  let controller: MonitorsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [UptimeModule],
      controllers: [MonitorsController],
      providers: [MonitorsService],
    }).compile()

    controller = module.get<MonitorsController>(MonitorsController)
  })

  it("should be defined", () => {
    expect(controller).toBeDefined()
  })
})
