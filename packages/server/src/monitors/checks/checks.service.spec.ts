import { InternalServerErrorException, NotFoundException } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { test as baseTest } from "vitest"
import type { CheckStateResultDto } from "../../uptime/dto/check-state.dto.js"
import { UptimeService } from "../../uptime/uptime.service.js"
import { MonitorsRepository } from "../monitors.repository.js"
import { ChecksRepository } from "./checks.repository.js"
import { ChecksService } from "./checks.service.js"
import { type CheckDto, checkListSchema, checkSchema } from "./dto/check.dto.js"

// El servicio solo usa los repositorios, que se sustituyen por mocks; se
// mockea la base de datos para que importarlos no abra ninguna conexión.
vi.mock("../../db/index.js", () => ({ db: {} }))

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
