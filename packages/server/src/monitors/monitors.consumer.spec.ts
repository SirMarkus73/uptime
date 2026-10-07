import { NotFoundException } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import type { Job } from "bullmq"
import { test as baseTest } from "vitest"
import { ChecksService } from "./checks/checks.service.js"
import type { CheckDto } from "./checks/dto/check.dto.js"
import { MonitorsConsumer } from "./monitors.consumer.js"
import type { RunMonitorJobData } from "./monitors.queue.js"

const job = { data: { monitorId: "monitor-1" } } as Job<RunMonitorJobData>

const test = baseTest
  .extend("checksService", () => ({
    createCheck: vi.fn<ChecksService["createCheck"]>(),
  }))
  .extend("consumer", async ({ checksService }) => {
    const module = await Test.createTestingModule({
      providers: [
        MonitorsConsumer,
        { provide: ChecksService, useValue: checksService },
      ],
    }).compile()

    return module.get(MonitorsConsumer)
  })

describe("MonitorConsumer", () => {
  test("should be defined", ({ consumer }) => {
    expect(consumer).toBeDefined()
  })

  describe("process", () => {
    test("creates a check for the monitor of the job", async ({
      checksService,
      consumer,
    }) => {
      checksService.createCheck.mockResolvedValueOnce({} as CheckDto)

      await expect(consumer.process(job)).resolves.toBeUndefined()

      expect(checksService.createCheck).toHaveBeenCalledExactlyOnceWith(
        "monitor-1",
      )
    })

    // BullMQ marca el job como fallido si `process` lanza.
    test("propagates service errors so the job fails", async ({
      checksService,
      consumer,
    }) => {
      checksService.createCheck.mockRejectedValueOnce(new NotFoundException())

      await expect(consumer.process(job)).rejects.toBeInstanceOf(
        NotFoundException,
      )
    })
  })
})
