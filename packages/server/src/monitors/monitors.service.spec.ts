import { Test, TestingModule } from "@nestjs/testing"
import { UptimeModule } from "../uptime/uptime.module.js"
import { MonitorsService } from "./monitors.service.js"

describe("MonitorService", () => {
  let service: MonitorsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [UptimeModule],
      providers: [MonitorsService],
    }).compile()

    service = module.get<MonitorsService>(MonitorsService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })
})
