import { getQueueToken } from "@nestjs/bullmq"
import { InternalServerErrorException, NotFoundException } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import type { Queue } from "bullmq"
import { eq } from "drizzle-orm"
import { test as baseTest } from "vitest"
import { check, monitor } from "../db/schema.js"
import { CheckStateResultDto } from "../uptime/dto/check-state.dto.js"
import { UptimeService } from "../uptime/uptime.service.js"
import { CreateMonitorDto } from "./dto/create-monitor.dto.js"
import {
  MonitorDetailDto,
  MonitorListDto,
  monitorDetailSchema,
  monitorListSchema,
} from "./dto/monitor.dto.js"
import { MONITORS_QUEUE, type RunMonitorJobData } from "./monitors.queue.js"
import { MonitorsService } from "./monitors.service.js"

const { dbMock, returning, values, where } = vi.hoisted(() => {
  const returning = vi.fn()
  const values = vi.fn(() => ({ returning }))
  const where = vi.fn()

  return {
    returning,
    values,
    where,
    dbMock: {
      insert: vi.fn(() => ({ values })),
      delete: vi.fn(() => ({ where })),
      query: {
        monitor: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
      },
    },
  }
})

vi.mock("../db/index.js", () => ({ db: dbMock }))

const MONITOR_ID = "8c5b3c1e-2f4a-4b8e-9d1a-3e6f7a8b9c0d"
const CHECK_ID = "3f2e1d0c-9b8a-4c7d-8e6f-5a4b3c2d1e0f"
const PREVIOUS_CHECK_ID = "7d6c5b4a-3e2f-4a1b-9c8d-7e6f5a4b3c2d"
const SCHEDULER_ID = `monitor:${MONITOR_ID}`

type MonitorsQueue = Queue<RunMonitorJobData>
type JobScheduler = Awaited<ReturnType<MonitorsQueue["getJobScheduler"]>>

const scheduler: JobScheduler = {
  key: SCHEDULER_ID,
  name: SCHEDULER_ID,
  next: 1_790_000_000_000,
  iterationCount: 1,
  every: 5 * 60 * 1000,
  template: { data: { monitorId: MONITOR_ID } },
}

const test = baseTest
  // The db mock is module-level, so reset it before every test to avoid
  // leaking queued `*Once` values from a failed test into the next one.
  .extend("db", { auto: true }, () => {
    vi.resetAllMocks()
    return dbMock
  })
  .extend("uptimeService", () => ({
    checkState: vi.fn<UptimeService["checkState"]>(),
  }))
  .extend("monitorsQueue", () => ({
    getJobScheduler: vi.fn<MonitorsQueue["getJobScheduler"]>(),
    upsertJobScheduler: vi.fn<MonitorsQueue["upsertJobScheduler"]>(),
    removeJobScheduler: vi.fn<MonitorsQueue["removeJobScheduler"]>(),
  }))
  .extend("service", async ({ uptimeService, monitorsQueue }) => {
    const module = await Test.createTestingModule({
      providers: [
        MonitorsService,
        { provide: UptimeService, useValue: uptimeService },
        { provide: getQueueToken(MONITORS_QUEUE), useValue: monitorsQueue },
      ],
    }).compile()

    return module.get(MonitorsService)
  })

describe("MonitorsService", () => {
  test("should be defined", ({ service }) => {
    expect(service).toBeDefined()
  })

  describe("createMonitor", () => {
    const input: CreateMonitorDto = {
      ownedBy: "user-1",
      webPage: "https://example.com",
      name: "Example",
      executeEveryMinutes: 10,
    }

    const created: Omit<MonitorDetailDto, "checks" | "hasScheduler"> = {
      id: MONITOR_ID,
      name: input.name,
      webPage: input.webPage,
      createdAt: "2026-09-30T00:00:00.000Z",
      ownedBy: input.ownedBy,
      executeEveryMinutes: 10,
    }

    test("inserts the monitor, schedules it and returns the created row", async ({
      db,
      monitorsQueue,
      service,
    }) => {
      returning.mockResolvedValueOnce([created])

      const result = await service.createMonitor(input)

      expect(db.insert).toHaveBeenCalledExactlyOnceWith(monitor)
      expect(values).toHaveBeenCalledExactlyOnceWith(input)
      expect(returning).toHaveBeenCalledExactlyOnceWith({
        id: monitor.id,
        name: monitor.name,
        webPage: monitor.webPage,
        createdAt: monitor.createdAt,
        ownedBy: monitor.ownedBy,
        executeEveryMinutes: monitor.executeEveryMinutes,
      })
      expect(monitorsQueue.upsertJobScheduler).toHaveBeenCalledExactlyOnceWith(
        SCHEDULER_ID,
        { every: 10 * 60 * 1000 },
        { data: { monitorId: MONITOR_ID } },
      )
      expect(result).toEqual(expect.schemaMatching(monitorDetailSchema))
      expect(result).toEqual<MonitorDetailDto>({
        ...created,
        checks: [],
        hasScheduler: true,
      })
    })

    test("schedules the monitor with the stored interval when it is omitted", async ({
      monitorsQueue,
      service,
    }) => {
      // El tipo del DTO lo exige, pero el body puede omitirlo y entonces la
      // base de datos pone el valor por defecto (5 minutos).
      const { executeEveryMinutes: _, ...withoutInterval } = input
      returning.mockResolvedValueOnce([{ ...created, executeEveryMinutes: 5 }])

      await service.createMonitor(withoutInterval as CreateMonitorDto)

      expect(monitorsQueue.upsertJobScheduler).toHaveBeenCalledExactlyOnceWith(
        SCHEDULER_ID,
        { every: 5 * 60 * 1000 },
        { data: { monitorId: MONITOR_ID } },
      )
    })

    test("throws InternalServerErrorException and skips the scheduler when nothing is returned", async ({
      monitorsQueue,
      service,
    }) => {
      returning.mockResolvedValueOnce([])

      await expect(service.createMonitor(input)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      )
      expect(monitorsQueue.upsertJobScheduler).not.toHaveBeenCalled()
    })

    test("throws InternalServerErrorException and skips the scheduler when the insert fails", async ({
      monitorsQueue,
      service,
    }) => {
      returning.mockRejectedValueOnce(new Error("connection lost"))

      await expect(service.createMonitor(input)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      )
      expect(monitorsQueue.upsertJobScheduler).not.toHaveBeenCalled()
    })

    test("throws InternalServerErrorException when the scheduler cannot be created", async ({
      monitorsQueue,
      service,
    }) => {
      returning.mockResolvedValueOnce([created])
      monitorsQueue.upsertJobScheduler.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(service.createMonitor(input)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      )
    })
  })

  describe("getMonitor", () => {
    const found: Omit<MonitorDetailDto, "hasScheduler"> = {
      id: MONITOR_ID,
      name: "Example",
      webPage: "https://example.com",
      ownedBy: "user-1",
      createdAt: "2026-09-30T00:00:00.000Z",
      executeEveryMinutes: 5,
      checks: [
        {
          id: CHECK_ID,
          isUp: true,
          statusCode: 200,
          responseTimeMs: 12.5,
          errorCode: null,
          checkedAt: "2026-09-30T00:00:01.000Z",
        },
      ],
    }

    test("returns the monitor with its last 5 checks and its scheduler", async ({
      db,
      monitorsQueue,
      service,
    }) => {
      monitorsQueue.getJobScheduler.mockResolvedValueOnce(scheduler)
      db.query.monitor.findFirst.mockResolvedValueOnce(found)

      const result = await service.getMonitor({ id: MONITOR_ID })

      expect(monitorsQueue.getJobScheduler).toHaveBeenCalledExactlyOnceWith(
        SCHEDULER_ID,
      )
      expect(db.query.monitor.findFirst).toHaveBeenCalledExactlyOnceWith({
        where: { id: MONITOR_ID },
        with: {
          checks: {
            limit: 5,
            orderBy: { checkedAt: "desc" },
          },
        },
      })
      expect(result).toEqual(expect.schemaMatching(monitorDetailSchema))
      expect(result).toEqual<MonitorDetailDto>({ ...found, hasScheduler: true })
    })

    test("returns hasScheduler false when the monitor is not scheduled", async ({
      db,
      monitorsQueue,
      service,
    }) => {
      monitorsQueue.getJobScheduler.mockResolvedValueOnce(undefined)
      db.query.monitor.findFirst.mockResolvedValueOnce(found)

      const result = await service.getMonitor({ id: MONITOR_ID })

      expect(result).toEqual(expect.schemaMatching(monitorDetailSchema))
      expect(result).toEqual<MonitorDetailDto>({
        ...found,
        hasScheduler: false,
      })
    })

    test("throws NotFoundException when the monitor does not exist", async ({
      db,
      service,
    }) => {
      db.query.monitor.findFirst.mockResolvedValueOnce(undefined)

      await expect(
        service.getMonitor({ id: MONITOR_ID }),
      ).rejects.toBeInstanceOf(NotFoundException)
    })

    test("throws InternalServerErrorException when the scheduler cannot be read", async ({
      monitorsQueue,
      service,
    }) => {
      monitorsQueue.getJobScheduler.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(
        service.getMonitor({ id: MONITOR_ID }),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
    })
  })

  describe("listMonitors", () => {
    test("returns the monitors owned by the user", async ({ db, service }) => {
      const monitors: MonitorListDto = [
        {
          id: MONITOR_ID,
          name: "Example",
          webPage: "https://example.com",
          createdAt: "2026-09-30T00:00:00.000Z",
          isUp: true,
          ownedBy: "user-1",
        },
        {
          id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
          name: "Never checked",
          webPage: "https://example.org",
          createdAt: "2026-09-30T00:00:00.000Z",
          isUp: null,
          ownedBy: "user-1",
        },
      ]
      db.query.monitor.findMany.mockResolvedValueOnce(monitors)

      const result = await service.listMonitors({ ownedBy: "user-1" })

      expect(db.query.monitor.findMany).toHaveBeenCalledOnce()
      expect(result).toEqual(expect.schemaMatching(monitorListSchema))
      expect(result).toEqual(monitors)
    })

    test("returns an empty list when the user has no monitors", async ({
      db,
      service,
    }) => {
      db.query.monitor.findMany.mockResolvedValueOnce([])

      const result = await service.listMonitors({ ownedBy: "user-1" })

      expect(result).toEqual(expect.schemaMatching(monitorListSchema))
      expect(result).toEqual([])
    })
  })

  describe("runMonitor", () => {
    const found: Omit<MonitorDetailDto, "hasScheduler"> = {
      id: MONITOR_ID,
      name: "Example",
      webPage: "https://example.com",
      ownedBy: "user-1",
      createdAt: "2026-09-30T00:00:00.000Z",
      executeEveryMinutes: 5,
      checks: [
        {
          id: PREVIOUS_CHECK_ID,
          isUp: false,
          statusCode: 503,
          responseTimeMs: 40.1,
          errorCode: null,
          checkedAt: "2026-09-29T00:00:00.000Z",
        },
      ],
    }
    const checkResult: CheckStateResultDto = {
      isUp: true,
      statusCode: 200,
      responseTimeMs: 12.5,
      errorCode: null,
      checkedAt: "2026-09-30T00:00:01.000Z",
    }
    const inserted: MonitorDetailDto["checks"][number] = {
      id: CHECK_ID,
      ...checkResult,
    }

    test("checks the web page and stores the result", async ({
      db,
      uptimeService,
      service,
    }) => {
      db.query.monitor.findFirst.mockResolvedValueOnce(found)
      uptimeService.checkState.mockResolvedValueOnce(checkResult)
      returning.mockResolvedValueOnce([inserted])

      const result = await service.runMonitor({ id: MONITOR_ID })

      expect(db.query.monitor.findFirst).toHaveBeenCalledExactlyOnceWith({
        where: { id: MONITOR_ID },
        with: {
          checks: {
            limit: 5,
            orderBy: { checkedAt: "desc" },
          },
        },
      })
      expect(uptimeService.checkState).toHaveBeenCalledExactlyOnceWith(
        found.webPage,
      )
      expect(db.insert).toHaveBeenCalledExactlyOnceWith(check)
      expect(values).toHaveBeenCalledExactlyOnceWith({
        ...checkResult,
        monitorId: MONITOR_ID,
      })
      expect(result).toEqual(expect.schemaMatching(monitorDetailSchema))
      expect(result).toEqual<MonitorDetailDto>({
        ...found,
        checks: [inserted, ...found.checks],
        hasScheduler: false,
      })
    })

    test("keeps only the last 5 checks, dropping the oldest one", async ({
      db,
      uptimeService,
      service,
    }) => {
      // Ordered newest first, as getMonitor returns them.
      const previousChecks: MonitorDetailDto["checks"] = Array.from(
        { length: 5 },
        (_, i) => ({
          id: `00000000-0000-4000-8000-00000000000${i}`,
          isUp: false,
          statusCode: 503,
          responseTimeMs: 40.1,
          errorCode: null,
          checkedAt: `2026-09-29T0${4 - i}:00:00.000Z`,
        }),
      )
      const foundWithFullHistory: typeof found = {
        ...found,
        checks: previousChecks,
      }
      db.query.monitor.findFirst.mockResolvedValueOnce(foundWithFullHistory)
      uptimeService.checkState.mockResolvedValueOnce(checkResult)
      returning.mockResolvedValueOnce([inserted])

      const result = await service.runMonitor({ id: MONITOR_ID })

      expect(result).toEqual(expect.schemaMatching(monitorDetailSchema))
      expect(result.checks).toEqual([inserted, ...previousChecks.slice(0, 4)])
    })

    test("throws NotFoundException and skips the check when the monitor does not exist", async ({
      db,
      uptimeService,
      service,
    }) => {
      db.query.monitor.findFirst.mockResolvedValueOnce(undefined)

      await expect(
        service.runMonitor({ id: MONITOR_ID }),
      ).rejects.toBeInstanceOf(NotFoundException)
      expect(uptimeService.checkState).not.toHaveBeenCalled()
      expect(db.insert).not.toHaveBeenCalled()
    })

    test("throws InternalServerErrorException when the check is not stored", async ({
      db,
      uptimeService,
      service,
    }) => {
      db.query.monitor.findFirst.mockResolvedValueOnce(found)
      uptimeService.checkState.mockResolvedValueOnce(checkResult)
      returning.mockResolvedValueOnce([])

      await expect(
        service.runMonitor({ id: MONITOR_ID }),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
    })

    test("throws InternalServerErrorException when the check insert fails", async ({
      db,
      uptimeService,
      service,
    }) => {
      db.query.monitor.findFirst.mockResolvedValueOnce(found)
      uptimeService.checkState.mockResolvedValueOnce(checkResult)
      returning.mockRejectedValueOnce(new Error("connection lost"))

      await expect(
        service.runMonitor({ id: MONITOR_ID }),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
    })
  })

  describe("deleteMonitor", () => {
    test("removes the scheduler and deletes the monitor with the given id", async ({
      db,
      monitorsQueue,
      service,
    }) => {
      where.mockResolvedValueOnce({ rowCount: 1 })

      await expect(
        service.deleteMonitor({ id: MONITOR_ID }),
      ).resolves.toBeUndefined()

      expect(monitorsQueue.removeJobScheduler).toHaveBeenCalledExactlyOnceWith(
        SCHEDULER_ID,
      )
      expect(db.delete).toHaveBeenCalledExactlyOnceWith(monitor)
      expect(where).toHaveBeenCalledExactlyOnceWith(eq(monitor.id, MONITOR_ID))
    })

    test("throws NotFoundException when no monitor was deleted", async ({
      service,
    }) => {
      where.mockResolvedValueOnce({ rowCount: 0 })

      await expect(
        service.deleteMonitor({ id: MONITOR_ID }),
      ).rejects.toBeInstanceOf(NotFoundException)
    })

    test("propagates database errors", async ({ service }) => {
      const error = new Error("connection lost")
      where.mockRejectedValueOnce(error)

      await expect(service.deleteMonitor({ id: MONITOR_ID })).rejects.toBe(
        error,
      )
    })

    test("throws InternalServerErrorException and keeps the monitor when the scheduler cannot be removed", async ({
      db,
      monitorsQueue,
      service,
    }) => {
      monitorsQueue.removeJobScheduler.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(
        service.deleteMonitor({ id: MONITOR_ID }),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
      expect(db.delete).not.toHaveBeenCalled()
    })
  })

  describe("activateMonitorScheduler", () => {
    const input = { id: MONITOR_ID, executeEveryMinutes: 15 }

    test("schedules the monitor every executeEveryMinutes when it is not scheduled", async ({
      monitorsQueue,
      service,
    }) => {
      monitorsQueue.getJobScheduler.mockResolvedValueOnce(undefined)

      await expect(
        service.activateMonitorScheduler(input),
      ).resolves.toBeUndefined()

      expect(monitorsQueue.getJobScheduler).toHaveBeenCalledExactlyOnceWith(
        SCHEDULER_ID,
      )
      expect(monitorsQueue.upsertJobScheduler).toHaveBeenCalledExactlyOnceWith(
        SCHEDULER_ID,
        { every: 15 * 60 * 1000 },
        { data: { monitorId: MONITOR_ID } },
      )
    })

    test("does nothing when the monitor is already scheduled", async ({
      monitorsQueue,
      service,
    }) => {
      monitorsQueue.getJobScheduler.mockResolvedValueOnce(scheduler)

      await expect(
        service.activateMonitorScheduler(input),
      ).resolves.toBeUndefined()

      expect(monitorsQueue.upsertJobScheduler).not.toHaveBeenCalled()
    })

    test("throws InternalServerErrorException when the scheduler cannot be read", async ({
      monitorsQueue,
      service,
    }) => {
      monitorsQueue.getJobScheduler.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(
        service.activateMonitorScheduler(input),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
      expect(monitorsQueue.upsertJobScheduler).not.toHaveBeenCalled()
    })

    test("throws InternalServerErrorException when the scheduler cannot be created", async ({
      monitorsQueue,
      service,
    }) => {
      monitorsQueue.getJobScheduler.mockResolvedValueOnce(undefined)
      monitorsQueue.upsertJobScheduler.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(
        service.activateMonitorScheduler(input),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
    })
  })

  describe("deactivateMonitorScheduler", () => {
    const input = { id: MONITOR_ID, executeEveryMinutes: 15 }

    test("removes the scheduler when the monitor is scheduled", async ({
      monitorsQueue,
      service,
    }) => {
      monitorsQueue.getJobScheduler.mockResolvedValueOnce(scheduler)

      await expect(
        service.deactivateMonitorScheduler(input),
      ).resolves.toBeUndefined()

      expect(monitorsQueue.getJobScheduler).toHaveBeenCalledExactlyOnceWith(
        SCHEDULER_ID,
      )
      expect(monitorsQueue.removeJobScheduler).toHaveBeenCalledExactlyOnceWith(
        SCHEDULER_ID,
      )
    })

    test("does nothing when the monitor is not scheduled", async ({
      monitorsQueue,
      service,
    }) => {
      monitorsQueue.getJobScheduler.mockResolvedValueOnce(undefined)

      await expect(
        service.deactivateMonitorScheduler(input),
      ).resolves.toBeUndefined()

      expect(monitorsQueue.removeJobScheduler).not.toHaveBeenCalled()
    })

    test("throws InternalServerErrorException when the scheduler cannot be read", async ({
      monitorsQueue,
      service,
    }) => {
      monitorsQueue.getJobScheduler.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(
        service.deactivateMonitorScheduler(input),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
      expect(monitorsQueue.removeJobScheduler).not.toHaveBeenCalled()
    })

    test("throws InternalServerErrorException when the scheduler cannot be removed", async ({
      monitorsQueue,
      service,
    }) => {
      monitorsQueue.getJobScheduler.mockResolvedValueOnce(scheduler)
      monitorsQueue.removeJobScheduler.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(
        service.deactivateMonitorScheduler(input),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
    })
  })
})
