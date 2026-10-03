import { getQueueToken } from "@nestjs/bullmq"
import { InternalServerErrorException, NotFoundException } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import type { Queue } from "bullmq"
import { test as baseTest } from "vitest"
import { check } from "../db/schema.js"
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
import { MonitorsRepository } from "./monitors.repository.js"
import { MonitorsService } from "./monitors.service.js"

// Solo runMonitor usa la base de datos directamente (para guardar la
// comprobación); el resto pasa por MonitorsRepository.
const { dbMock, returning, values } = vi.hoisted(() => {
  const returning = vi.fn()
  const values = vi.fn(() => ({ returning }))

  return {
    returning,
    values,
    dbMock: {
      insert: vi.fn(() => ({ values })),
    },
  }
})

vi.mock("../db/index.js", () => ({ db: dbMock }))

const MONITOR_ID = "8c5b3c1e-2f4a-4b8e-9d1a-3e6f7a8b9c0d"
const CHECK_ID = "3f2e1d0c-9b8a-4c7d-8e6f-5a4b3c2d1e0f"
const PREVIOUS_CHECK_ID = "7d6c5b4a-3e2f-4a1b-9c8d-7e6f5a4b3c2d"
const SCHEDULER_ID = `monitor:${MONITOR_ID}`

type MonitorsQueue = Queue<RunMonitorJobData>
type StoredMonitor = NonNullable<
  Awaited<ReturnType<MonitorsRepository["create"]>>
>
type StoredMonitorWithChecks = NonNullable<
  Awaited<ReturnType<MonitorsRepository["findWithChecks"]>>
>
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
  .extend("monitorsRepository", () => ({
    create: vi.fn<MonitorsRepository["create"]>(),
    findWithChecks: vi.fn<MonitorsRepository["findWithChecks"]>(),
    findManyWithStatus: vi.fn<MonitorsRepository["findManyWithStatus"]>(),
    destroyMonitor: vi.fn<MonitorsRepository["destroyMonitor"]>(),
  }))
  .extend(
    "service",
    async ({ uptimeService, monitorsQueue, monitorsRepository }) => {
      const module = await Test.createTestingModule({
        providers: [
          MonitorsService,
          { provide: UptimeService, useValue: uptimeService },
          { provide: getQueueToken(MONITORS_QUEUE), useValue: monitorsQueue },
          { provide: MonitorsRepository, useValue: monitorsRepository },
        ],
      }).compile()

      return module.get(MonitorsService)
    },
  )

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

    const created: StoredMonitor = {
      id: MONITOR_ID,
      name: input.name,
      webPage: input.webPage,
      createdAt: "2026-09-30T00:00:00.000Z",
      ownedBy: input.ownedBy,
      executeEveryMinutes: 10,
    }

    test("creates the monitor, schedules it and returns it", async ({
      monitorsQueue,
      monitorsRepository,
      service,
    }) => {
      monitorsRepository.create.mockResolvedValueOnce(created)

      const result = await service.createMonitor(input)

      expect(monitorsRepository.create).toHaveBeenCalledExactlyOnceWith(input)
      expect(monitorsQueue.upsertJobScheduler).toHaveBeenCalledExactlyOnceWith(
        SCHEDULER_ID,
        { every: 10 * 60 * 1000 },
        { data: { monitorId: MONITOR_ID } },
      )
      expect(result).toEqual(expect.schemaMatching(monitorDetailSchema))
      expect(result).toEqual<MonitorDetailDto>({
        ...created,
        createdAt: "2026-09-30T00:00:00.000Z",
        checks: [],
        hasScheduler: true,
      })
    })

    test("schedules the monitor with the stored interval when it is omitted", async ({
      monitorsQueue,
      monitorsRepository,
      service,
    }) => {
      // El tipo del DTO lo exige, pero el body puede omitirlo y entonces la
      // base de datos pone el valor por defecto (5 minutos).
      const { executeEveryMinutes: _, ...withoutInterval } = input
      monitorsRepository.create.mockResolvedValueOnce({
        ...created,
        executeEveryMinutes: 5,
      })

      await service.createMonitor(withoutInterval as CreateMonitorDto)

      expect(monitorsQueue.upsertJobScheduler).toHaveBeenCalledExactlyOnceWith(
        SCHEDULER_ID,
        { every: 5 * 60 * 1000 },
        { data: { monitorId: MONITOR_ID } },
      )
    })

    test("throws InternalServerErrorException and skips the scheduler when nothing is returned", async ({
      monitorsQueue,
      monitorsRepository,
      service,
    }) => {
      monitorsRepository.create.mockResolvedValueOnce(undefined)

      await expect(service.createMonitor(input)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      )
      expect(monitorsQueue.upsertJobScheduler).not.toHaveBeenCalled()
    })

    test("throws InternalServerErrorException and skips the scheduler when the insert fails", async ({
      monitorsQueue,
      monitorsRepository,
      service,
    }) => {
      monitorsRepository.create.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(service.createMonitor(input)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      )
      expect(monitorsQueue.upsertJobScheduler).not.toHaveBeenCalled()
    })

    test("throws InternalServerErrorException when the scheduler cannot be created", async ({
      monitorsQueue,
      monitorsRepository,
      service,
    }) => {
      monitorsRepository.create.mockResolvedValueOnce(created)
      monitorsQueue.upsertJobScheduler.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(service.createMonitor(input)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      )
    })
  })

  describe("getMonitor", () => {
    const found: StoredMonitorWithChecks = {
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
          monitorId: MONITOR_ID,
        },
      ],
    }

    test("returns the monitor with its last checks and its scheduler", async ({
      monitorsQueue,
      monitorsRepository,
      service,
    }) => {
      monitorsQueue.getJobScheduler.mockResolvedValueOnce(scheduler)
      monitorsRepository.findWithChecks.mockResolvedValueOnce(found)

      const result = await service.getMonitor({ id: MONITOR_ID })

      expect(monitorsQueue.getJobScheduler).toHaveBeenCalledExactlyOnceWith(
        SCHEDULER_ID,
      )
      expect(monitorsRepository.findWithChecks).toHaveBeenCalledExactlyOnceWith(
        MONITOR_ID,
      )
      expect(result).toEqual(expect.schemaMatching(monitorDetailSchema))
      expect(result).toEqual({ ...found, hasScheduler: true })
    })

    test("returns hasScheduler false when the monitor is not scheduled", async ({
      monitorsQueue,
      monitorsRepository,
      service,
    }) => {
      monitorsQueue.getJobScheduler.mockResolvedValueOnce(undefined)
      monitorsRepository.findWithChecks.mockResolvedValueOnce(found)

      const result = await service.getMonitor({ id: MONITOR_ID })

      expect(result).toEqual(expect.schemaMatching(monitorDetailSchema))
      expect(result).toEqual({ ...found, hasScheduler: false })
    })

    test("throws NotFoundException when the monitor does not exist", async ({
      monitorsRepository,
      service,
    }) => {
      monitorsRepository.findWithChecks.mockResolvedValueOnce(undefined)

      await expect(
        service.getMonitor({ id: MONITOR_ID }),
      ).rejects.toBeInstanceOf(NotFoundException)
    })

    test("throws InternalServerErrorException when the monitor cannot be read", async ({
      monitorsRepository,
      service,
    }) => {
      monitorsRepository.findWithChecks.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(
        service.getMonitor({ id: MONITOR_ID }),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
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
    test("returns the monitors owned by the user", async ({
      monitorsRepository,
      service,
    }) => {
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
      monitorsRepository.findManyWithStatus.mockResolvedValueOnce(monitors)

      const result = await service.listMonitors({ ownedBy: "user-1" })

      expect(
        monitorsRepository.findManyWithStatus,
      ).toHaveBeenCalledExactlyOnceWith("user-1")
      expect(result).toEqual(expect.schemaMatching(monitorListSchema))
      expect(result).toEqual(monitors)
    })

    test("returns an empty list when the user has no monitors", async ({
      monitorsRepository,
      service,
    }) => {
      monitorsRepository.findManyWithStatus.mockResolvedValueOnce([])

      const result = await service.listMonitors({ ownedBy: "user-1" })

      expect(result).toEqual(expect.schemaMatching(monitorListSchema))
      expect(result).toEqual([])
    })

    test("throws InternalServerErrorException when the monitors cannot be read", async ({
      monitorsRepository,
      service,
    }) => {
      monitorsRepository.findManyWithStatus.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(
        service.listMonitors({ ownedBy: "user-1" }),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
    })
  })

  describe("runMonitor", () => {
    const found: StoredMonitorWithChecks = {
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
          monitorId: MONITOR_ID,
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
      monitorsRepository,
      uptimeService,
      service,
    }) => {
      monitorsRepository.findWithChecks.mockResolvedValueOnce(found)
      uptimeService.checkState.mockResolvedValueOnce(checkResult)
      returning.mockResolvedValueOnce([inserted])

      const result = await service.runMonitor({ id: MONITOR_ID })

      expect(monitorsRepository.findWithChecks).toHaveBeenCalledExactlyOnceWith(
        MONITOR_ID,
      )
      expect(uptimeService.checkState).toHaveBeenCalledExactlyOnceWith(
        found.webPage,
      )
      expect(db.insert).toHaveBeenCalledExactlyOnceWith(check)
      expect(values).toHaveBeenCalledExactlyOnceWith({
        ...checkResult,
        monitorId: MONITOR_ID,
      })
      expect(result).toEqual(expect.schemaMatching(monitorDetailSchema))
      expect(result).toEqual({
        ...found,
        checks: [inserted, ...found.checks],
        hasScheduler: false,
      })
    })

    test("keeps only the last 5 checks, dropping the oldest one", async ({
      monitorsRepository,
      uptimeService,
      service,
    }) => {
      // Ordered newest first, as getMonitor returns them.
      const previousChecks: StoredMonitorWithChecks["checks"] = Array.from(
        { length: 5 },
        (_, i) => ({
          id: `00000000-0000-4000-8000-00000000000${i}`,
          isUp: false,
          statusCode: 503,
          responseTimeMs: 40.1,
          errorCode: null,
          checkedAt: `2026-09-29T0${4 - i}:00:00.000Z`,
          monitorId: MONITOR_ID,
        }),
      )
      monitorsRepository.findWithChecks.mockResolvedValueOnce({
        ...found,
        checks: previousChecks,
      })
      uptimeService.checkState.mockResolvedValueOnce(checkResult)
      returning.mockResolvedValueOnce([inserted])

      const result = await service.runMonitor({ id: MONITOR_ID })

      expect(result).toEqual(expect.schemaMatching(monitorDetailSchema))
      expect(result.checks).toEqual([inserted, ...previousChecks.slice(0, 4)])
    })

    test("throws NotFoundException and skips the check when the monitor does not exist", async ({
      db,
      monitorsRepository,
      uptimeService,
      service,
    }) => {
      monitorsRepository.findWithChecks.mockResolvedValueOnce(undefined)

      await expect(
        service.runMonitor({ id: MONITOR_ID }),
      ).rejects.toBeInstanceOf(NotFoundException)
      expect(uptimeService.checkState).not.toHaveBeenCalled()
      expect(db.insert).not.toHaveBeenCalled()
    })

    test("throws InternalServerErrorException and skips the check when the monitor cannot be read", async ({
      db,
      monitorsRepository,
      uptimeService,
      service,
    }) => {
      monitorsRepository.findWithChecks.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(
        service.runMonitor({ id: MONITOR_ID }),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
      expect(uptimeService.checkState).not.toHaveBeenCalled()
      expect(db.insert).not.toHaveBeenCalled()
    })

    test("throws InternalServerErrorException when the check is not stored", async ({
      monitorsRepository,
      uptimeService,
      service,
    }) => {
      monitorsRepository.findWithChecks.mockResolvedValueOnce(found)
      uptimeService.checkState.mockResolvedValueOnce(checkResult)
      returning.mockResolvedValueOnce([])

      await expect(
        service.runMonitor({ id: MONITOR_ID }),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
    })

    test("throws InternalServerErrorException when the check insert fails", async ({
      monitorsRepository,
      uptimeService,
      service,
    }) => {
      monitorsRepository.findWithChecks.mockResolvedValueOnce(found)
      uptimeService.checkState.mockResolvedValueOnce(checkResult)
      returning.mockRejectedValueOnce(new Error("connection lost"))

      await expect(
        service.runMonitor({ id: MONITOR_ID }),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
    })
  })

  describe("deleteMonitor", () => {
    test("removes the scheduler and deletes the monitor with the given id", async ({
      monitorsQueue,
      monitorsRepository,
      service,
    }) => {
      monitorsRepository.destroyMonitor.mockResolvedValueOnce()

      await expect(
        service.deleteMonitor({ id: MONITOR_ID }),
      ).resolves.toBeUndefined()

      expect(monitorsQueue.removeJobScheduler).toHaveBeenCalledExactlyOnceWith(
        SCHEDULER_ID,
      )
      expect(monitorsRepository.destroyMonitor).toHaveBeenCalledExactlyOnceWith(
        MONITOR_ID,
      )
      // El scheduler se quita antes de borrar para no dejarlo huérfano.
      expect(monitorsQueue.removeJobScheduler).toHaveBeenCalledBefore(
        monitorsRepository.destroyMonitor,
      )
    })

    test("throws InternalServerErrorException when the monitor cannot be deleted", async ({
      monitorsRepository,
      service,
    }) => {
      monitorsRepository.destroyMonitor.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(
        service.deleteMonitor({ id: MONITOR_ID }),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
    })

    test("throws InternalServerErrorException and keeps the monitor when the scheduler cannot be removed", async ({
      monitorsQueue,
      monitorsRepository,
      service,
    }) => {
      monitorsQueue.removeJobScheduler.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(
        service.deleteMonitor({ id: MONITOR_ID }),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
      expect(monitorsRepository.destroyMonitor).not.toHaveBeenCalled()
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
