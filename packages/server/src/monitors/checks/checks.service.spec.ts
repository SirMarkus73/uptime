import { InternalServerErrorException, NotFoundException } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import type { UserSession } from "@thallesp/nestjs-better-auth"
import { test as baseTest } from "vitest"
import type { CheckStateResultDto } from "../../uptime/dto/check-state.dto.js"
import { UptimeService } from "../../uptime/uptime.service.js"
import { MonitorsRepository } from "../monitors.repository.js"
import { ChecksRepository } from "./checks.repository.js"
import { ChecksService } from "./checks.service.js"
import { type CheckDto, checkListSchema, checkSchema } from "./dto/check.dto.js"
import { decodeChecksCursor } from "./dto/find-all.dto.js"

// El servicio usa los repositorios, que se sustituyen por mocks, y `findAll`
// consulta `db` directamente; se mockea la base de datos para que no se abra
// ninguna conexión.
const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }))

vi.mock("../../db/index.js", () => ({
  db: { query: { check: { findMany } } },
}))

const MONITOR_ID = "8c5b3c1e-2f4a-4b8e-9d1a-3e6f7a8b9c0d"
const CHECK_ID = "3f2e1d0c-9b8a-4c7d-8e6f-5a4b3c2d1e0f"

type FoundMonitor = NonNullable<Awaited<ReturnType<MonitorsRepository["find"]>>>

const found: FoundMonitor = {
  id: MONITOR_ID,
  name: "Example",
  webPage: "https://example.com",
  ownedBy: "user-1",
  createdAt: "2026-09-30T00:00:00.000Z",
  executeEveryMinutes: 5,
}

const checkResult: CheckStateResultDto = {
  isUp: true,
  statusCode: 200,
  responseTimeMs: 12.5,
  errorCode: null,
  checkedAt: "2026-09-30T00:00:01.000Z",
}

const created: CheckDto = { id: CHECK_ID, ...checkResult }

const session = { user: { id: "user-1" } } as UserSession

// Filas en el formato en que Postgres devuelve `timestamptz`, ordenadas de más
// reciente a más antigua como en la consulta
function checkRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    ...created,
    id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    checkedAt: `2026-09-30 00:${String(59 - i).padStart(2, "0")}:00.123+00`,
  }))
}

const test = baseTest
  .extend("checksRepository", () => ({
    findAllSinceDays: vi.fn<ChecksRepository["findAllSinceDays"]>(),
    create: vi.fn<ChecksRepository["create"]>(),
  }))
  .extend("monitorsRepository", () => ({
    find: vi.fn<MonitorsRepository["find"]>(),
  }))
  .extend("uptimeService", () => ({
    checkState: vi.fn<UptimeService["checkState"]>(),
  }))
  .extend(
    "service",
    async ({ checksRepository, monitorsRepository, uptimeService }) => {
      const module = await Test.createTestingModule({
        providers: [
          ChecksService,
          { provide: ChecksRepository, useValue: checksRepository },
          { provide: MonitorsRepository, useValue: monitorsRepository },
          { provide: UptimeService, useValue: uptimeService },
        ],
      }).compile()

      return module.get(ChecksService)
    },
  )

describe("ChecksService", () => {
  test("should be defined", ({ service }) => {
    expect(service).toBeDefined()
  })

  describe("findMonitor", () => {
    test("returns the monitor with the given id", async ({
      monitorsRepository,
      service,
    }) => {
      monitorsRepository.find.mockResolvedValueOnce(found)

      const result = await service.findMonitor(MONITOR_ID)

      expect(monitorsRepository.find).toHaveBeenCalledExactlyOnceWith(
        MONITOR_ID,
      )
      expect(result).toEqual(found)
    })

    test("throws NotFoundException when the monitor does not exist", async ({
      monitorsRepository,
      service,
    }) => {
      monitorsRepository.find.mockResolvedValueOnce(undefined)

      await expect(service.findMonitor(MONITOR_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      )
    })

    test("throws InternalServerErrorException when the monitor cannot be read", async ({
      monitorsRepository,
      service,
    }) => {
      monitorsRepository.find.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(service.findMonitor(MONITOR_ID)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      )
    })
  })

  describe("findAll", () => {
    beforeEach(() => {
      findMany.mockReset()
    })

    test("returns the first page without filtering by cursor", async ({
      service,
    }) => {
      const rows = checkRows(3)
      findMany.mockResolvedValueOnce(rows)

      const result = await service.findAll(session, MONITOR_ID)

      const [query] = findMany.mock.lastCall ?? []
      expect(query.where).toEqual({
        monitorId: MONITOR_ID,
        monitor: { ownedBy: "user-1" },
      })
      expect(query.limit).toBe(21)
      expect(result).toEqual({
        data: rows,
        meta: { nextCursor: null, size: 3 },
      })
    })

    test("returns 20 checks and a cursor with checkedAt and id of the next one", async ({
      service,
    }) => {
      const rows = checkRows(21)
      findMany.mockResolvedValueOnce(rows)

      const result = await service.findAll(session, MONITOR_ID)

      expect(result.data).toEqual(rows.slice(0, 20))
      expect(result.meta.size).toBe(20)
      expect(decodeChecksCursor(result.meta.nextCursor ?? "")).toEqual({
        checkedAt: "2026-09-30T00:39:00.123Z",
        id: rows[20]?.id,
      })
    })

    test("returns no cursor when there are exactly 20 checks", async ({
      service,
    }) => {
      findMany.mockResolvedValueOnce(checkRows(20))

      const result = await service.findAll(session, MONITOR_ID)

      expect(result.meta).toEqual({ nextCursor: null, size: 20 })
    })

    test("filters by checkedAt and id so checks with the same checkedAt are not repeated", async ({
      service,
    }) => {
      const after = { checkedAt: "2026-09-30T00:40:00.123Z", id: CHECK_ID }
      findMany.mockResolvedValueOnce([])

      const result = await service.findAll(session, MONITOR_ID, after)

      const [query] = findMany.mock.lastCall ?? []
      expect(query.where).toEqual({
        monitorId: MONITOR_ID,
        monitor: { ownedBy: "user-1" },
        OR: [
          { checkedAt: { lt: after.checkedAt } },
          { checkedAt: after.checkedAt, id: { lte: after.id } },
        ],
      })
      expect(result).toEqual({ data: [], meta: { nextCursor: null, size: 0 } })
    })

    test("throws InternalServerErrorException when the checks cannot be read", async ({
      service,
    }) => {
      findMany.mockRejectedValueOnce(new Error("connection lost"))

      await expect(service.findAll(session, MONITOR_ID)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      )
    })
  })

  describe("findSinceDays", () => {
    test("returns the checks of the monitor since the given days", async ({
      checksRepository,
      service,
    }) => {
      checksRepository.findAllSinceDays.mockResolvedValueOnce([created])

      const result = await service.findSinceDays(MONITOR_ID, 7)

      expect(checksRepository.findAllSinceDays).toHaveBeenCalledExactlyOnceWith(
        MONITOR_ID,
        7,
      )
      expect(result).toEqual(expect.schemaMatching(checkListSchema))
      expect(result).toEqual([created])
    })

    test("throws InternalServerErrorException when the checks cannot be read", async ({
      checksRepository,
      service,
    }) => {
      checksRepository.findAllSinceDays.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(service.findSinceDays(MONITOR_ID, 7)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      )
    })
  })

  describe("createCheck", () => {
    test("checks the web page and stores the result", async ({
      checksRepository,
      monitorsRepository,
      uptimeService,
      service,
    }) => {
      monitorsRepository.find.mockResolvedValueOnce(found)
      uptimeService.checkState.mockResolvedValueOnce(checkResult)
      checksRepository.create.mockResolvedValueOnce(created)

      const result = await service.createCheck(MONITOR_ID)

      expect(uptimeService.checkState).toHaveBeenCalledExactlyOnceWith(
        found.webPage,
      )
      expect(checksRepository.create).toHaveBeenCalledExactlyOnceWith({
        ...checkResult,
        monitorId: MONITOR_ID,
      })
      expect(result).toEqual(expect.schemaMatching(checkSchema))
      expect(result).toEqual(created)
    })

    test("throws NotFoundException and skips the check when the monitor does not exist", async ({
      checksRepository,
      monitorsRepository,
      uptimeService,
      service,
    }) => {
      monitorsRepository.find.mockResolvedValueOnce(undefined)

      await expect(service.createCheck(MONITOR_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      )
      expect(uptimeService.checkState).not.toHaveBeenCalled()
      expect(checksRepository.create).not.toHaveBeenCalled()
    })

    test("throws InternalServerErrorException and skips the check when the monitor cannot be read", async ({
      checksRepository,
      monitorsRepository,
      uptimeService,
      service,
    }) => {
      monitorsRepository.find.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(service.createCheck(MONITOR_ID)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      )
      expect(uptimeService.checkState).not.toHaveBeenCalled()
      expect(checksRepository.create).not.toHaveBeenCalled()
    })

    test("throws InternalServerErrorException when the check is not stored", async ({
      checksRepository,
      monitorsRepository,
      uptimeService,
      service,
    }) => {
      monitorsRepository.find.mockResolvedValueOnce(found)
      uptimeService.checkState.mockResolvedValueOnce(checkResult)
      checksRepository.create.mockResolvedValueOnce(undefined)

      await expect(service.createCheck(MONITOR_ID)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      )
    })

    test("throws InternalServerErrorException when the check insert fails", async ({
      checksRepository,
      monitorsRepository,
      uptimeService,
      service,
    }) => {
      monitorsRepository.find.mockResolvedValueOnce(found)
      uptimeService.checkState.mockResolvedValueOnce(checkResult)
      checksRepository.create.mockRejectedValueOnce(
        new Error("connection lost"),
      )

      await expect(service.createCheck(MONITOR_ID)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      )
    })
  })
})
