import { NotFoundException } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import type { Job } from "bullmq"
import { test as baseTest } from "vitest"
import type { MonitorDetailDto } from "./dto/monitor.dto.js"
import { MonitorsConsumer } from "./monitors.consumer.js"
import type { RunMonitorJobData } from "./monitors.queue.js"
import { MonitorsService } from "./monitors.service.js"

const job = { data: { monitorId: "monitor-1" } } as Job<RunMonitorJobData>

const test = baseTest
  .extend("monitorsService", () => ({
    runMonitor: vi.fn<MonitorsService["runMonitor"]>(),
  }))
  .extend("consumer", async ({ monitorsService }) => {
    const module = await Test.createTestingModule({
      providers: [
        MonitorsConsumer,
        { provide: MonitorsService, useValue: monitorsService },
      ],
    }).compile()

    return module.get(MonitorsConsumer)
  })

describe("MonitorConsumer", () => {
  test("should be defined", ({ consumer }) => {
    expect(consumer).toBeDefined()
  })

  describe("process", () => {
    test("runs the monitor of the job", async ({
      monitorsService,
      consumer,
    }) => {
      monitorsService.runMonitor.mockResolvedValueOnce({} as MonitorDetailDto)

      await expect(consumer.process(job)).resolves.toBeUndefined()

      expect(monitorsService.runMonitor).toHaveBeenCalledExactlyOnceWith({
        id: "monitor-1",
      })
    })

    // BullMQ marca el job como fallido si `process` lanza.
    test("propagates service errors so the job fails", async ({
      monitorsService,
      consumer,
    }) => {
      monitorsService.runMonitor.mockRejectedValueOnce(new NotFoundException())

      await expect(consumer.process(job)).rejects.toBeInstanceOf(
        NotFoundException,
      )
    })
  })
})
