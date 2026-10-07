import { getQueueToken } from "@nestjs/bullmq"
import { InternalServerErrorException, NotFoundException } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import type { Queue } from "bullmq"
import { test as baseTest } from "vitest"
import { ChecksRepository } from "./checks/checks.repository.js"
import { CheckDto } from "./checks/dto/check.dto.js"
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

// El servicio solo usa los repositorios, que se sustituyen por mocks; se
// mockea la base de datos para que importarlos no abra ninguna conexión.
vi.mock("../db/index.js", () => ({ db: {} }))

const MONITOR_ID = "8c5b3c1e-2f4a-4b8e-9d1a-3e6f7a8b9c0d"
const CHECK_ID = "3f2e1d0c-9b8a-4c7d-8e6f-5a4b3c2d1e0f"
const SCHEDULER_ID = `monitor:${MONITOR_ID}`

type MonitorsQueue = Queue<RunMonitorJobData>
type StoredMonitor = NonNullable<
  Awaited<ReturnType<MonitorsRepository["create"]>>
>
type FoundMonitor = NonNullable<Awaited<ReturnType<MonitorsRepository["find"]>>>
type ListedMonitors = Awaited<
  ReturnType<MonitorsRepository["findManyWithLastCheck"]>
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

const lastCheck: CheckDto = {
  id: CHECK_ID,
  isUp: true,
  statusCode: 200,
  responseTimeMs: 12.5,
  errorCode: null,
  checkedAt: "2026-09-30T00:00:01.000Z",
}

const test = baseTest
  .extend("monitorsQueue", () => ({
    getJobScheduler: vi.fn<MonitorsQueue["getJobScheduler"]>(),
    upsertJobScheduler: vi.fn<MonitorsQueue["upsertJobScheduler"]>(),
    removeJobScheduler: vi.fn<MonitorsQueue["removeJobScheduler"]>(),
  }))
  .extend("monitorsRepository", () => ({
    create: vi.fn<MonitorsRepository["create"]>(),
    find: vi.fn<MonitorsRepository["find"]>(),
    findManyWithLastCheck: vi.fn<MonitorsRepository["findManyWithLastCheck"]>(),
    destroyMonitor: vi.fn<MonitorsRepository["destroyMonitor"]>(),
  }))
  .extend("checksRepository", () => ({
    findLatest: vi.fn<ChecksRepository["findLatest"]>(),
  }))
  .extend(
    "service",
    async ({ monitorsQueue, monitorsRepository, checksRepository }) => {
      const module = await Test.createTestingModule({
        providers: [
          MonitorsService,
          { provide: getQueueToken(MONITORS_QUEUE), useValue: monitorsQueue },
          { provide: MonitorsRepository, useValue: monitorsRepository },
          { provide: ChecksRepository, useValue: checksRepository },
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
        lastCheck: null,
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
    const found: FoundMonitor = {
      id: MONITOR_ID,
      name: "Example",
      webPage: "https://example.com",
      ownedBy: "user-1",
      createdAt: "2026-09-30T00:00:00.000Z",
      executeEveryMinutes: 5,
    }

    test("returns the monitor with its last check and its scheduler", async ({
      monitorsQueue,
      monitorsRepository,
      checksRepository,
      service,
    }) => {
      monitorsQueue.getJobScheduler.mockResolvedValueOnce(scheduler)
      monitorsRepository.find.mockResolvedValueOnce(found)
      checksRepository.findLatest.mockResolvedValueOnce(lastCheck)

      const result = await service.getMonitor({ id: MONITOR_ID })

      expect(monitorsQueue.getJobScheduler).toHaveBeenCalledExactlyOnceWith(
        SCHEDULER_ID,
      )
      expect(monitorsRepository.find).toHaveBeenCalledExactlyOnceWith(
        MONITOR_ID,
      )
      expect(checksRepository.findLatest).toHaveBeenCalledExactlyOnceWith(
        MONITOR_ID,
      )
      expect(result).toEqual(expect.schemaMatching(monitorDetailSchema))
      expect(result).toEqual<MonitorDetailDto>({
        ...found,
        lastCheck,
        hasScheduler: true,
      })
    })

    test("returns lastCheck null when the monitor has never been checked", async ({
      monitorsQueue,
      monitorsRepository,
      checksRepository,
      service,
    }) => {
      monitorsQueue.getJobScheduler.mockResolvedValueOnce(scheduler)
      monitorsRepository.find.mockResolvedValueOnce(found)
      checksRepository.findLatest.mockResolvedValueOnce(undefined)

      const result = await service.getMonitor({ id: MONITOR_ID })

      expect(result).toEqual(expect.schemaMatching(monitorDetailSchema))
      expect(result.lastCheck).toBeNull()
    })

    test("returns hasScheduler false when the monitor is not scheduled", async ({
      monitorsQueue,
      monitorsRepository,
      checksRepository,
      service,
    }) => {
      monitorsQueue.getJobScheduler.mockResolvedValueOnce(undefined)
      monitorsRepository.find.mockResolvedValueOnce(found)
      checksRepository.findLatest.mockResolvedValueOnce(lastCheck)

      const result = await service.getMonitor({ id: MONITOR_ID })

      expect(result).toEqual(expect.schemaMatching(monitorDetailSchema))
      expect(result).toEqual<MonitorDetailDto>({
        ...found,
        lastCheck,
        hasScheduler: false,
      })
    })

    test("throws NotFoundException when the monitor does not exist", async ({
      monitorsRepository,
      service,
    }) => {
      monitorsRepository.find.mockResolvedValueOnce(undefined)

      await expect(
        service.getMonitor({ id: MONITOR_ID }),
      ).rejects.toBeInstanceOf(NotFoundException)
    })

    test("throws InternalServerErrorException when the monitor cannot be read", async ({
      monitorsRepository,
      service,
    }) => {
      monitorsRepository.find.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(
        service.getMonitor({ id: MONITOR_ID }),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
    })

    test("throws InternalServerErrorException when the last check cannot be read", async ({
      monitorsRepository,
      checksRepository,
      service,
    }) => {
      monitorsRepository.find.mockResolvedValueOnce(found)
      checksRepository.findLatest.mockRejectedValueOnce(
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
    test("returns the monitors owned by the user with their last check", async ({
      monitorsRepository,
      service,
    }) => {
      const listed: ListedMonitors = [
        {
          id: MONITOR_ID,
          name: "Example",
          webPage: "https://example.com",
          createdAt: "2026-09-30T00:00:00.000Z",
          ownedBy: "user-1",
          checks: [lastCheck],
        },
        {
          id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
          name: "Never checked",
          webPage: "https://example.org",
          createdAt: "2026-09-30T00:00:00.000Z",
          ownedBy: "user-1",
          checks: [],
        },
      ]
      monitorsRepository.findManyWithLastCheck.mockResolvedValueOnce(listed)

      const result = await service.listMonitors({ ownedBy: "user-1" })

      expect(
        monitorsRepository.findManyWithLastCheck,
      ).toHaveBeenCalledExactlyOnceWith("user-1")
      expect(result).toEqual(expect.schemaMatching(monitorListSchema))
      expect(result).toEqual<MonitorListDto>([
        {
          id: MONITOR_ID,
          name: "Example",
          webPage: "https://example.com",
          createdAt: "2026-09-30T00:00:00.000Z",
          ownedBy: "user-1",
          lastCheck,
        },
        {
          id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
          name: "Never checked",
          webPage: "https://example.org",
          createdAt: "2026-09-30T00:00:00.000Z",
          ownedBy: "user-1",
          lastCheck: null,
        },
      ])
    })
    test("returns an empty list when the user has no monitors", async ({
      monitorsRepository,
      service,
    }) => {
      monitorsRepository.findManyWithLastCheck.mockResolvedValueOnce([])

      const result = await service.listMonitors({ ownedBy: "user-1" })

      expect(result).toEqual(expect.schemaMatching(monitorListSchema))
      expect(result).toEqual([])
    })

    test("throws InternalServerErrorException when the monitors cannot be read", async ({
      monitorsRepository,
      service,
    }) => {
      monitorsRepository.findManyWithLastCheck.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(
        service.listMonitors({ ownedBy: "user-1" }),
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
