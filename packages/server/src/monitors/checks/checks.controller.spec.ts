import { InternalServerErrorException, NotFoundException } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import type { UserSession } from "@thallesp/nestjs-better-auth"
import { test as baseTest } from "vitest"
import { MonitorsRepository } from "../monitors.repository.js"
import { ChecksController } from "./checks.controller.js"
import { ChecksService } from "./checks.service.js"
import type { CheckDto } from "./dto/check.dto.js"
import type { CheckStatDto } from "./dto/find-check.dto.js"

// Importar el servicio importa los repositorios; se mockea la base de datos
// para que no se abra ninguna conexión.
vi.mock("../../db/index.js", () => ({ db: {} }))

const session = { user: { id: "user-1" } } as UserSession

type FoundMonitor = NonNullable<Awaited<ReturnType<MonitorsRepository["find"]>>>

const found: FoundMonitor = {
  id: "monitor-1",
  name: "Example",
  webPage: "https://example.com",
  ownedBy: "user-1",
  createdAt: "2026-09-30T00:00:00.000Z",
  executeEveryMinutes: 5,
}

const createdCheck: CheckDto = {
  id: "check-1",
  isUp: true,
  statusCode: 200,
  responseTimeMs: 12.5,
  errorCode: null,
  checkedAt: "2026-09-30T00:00:01.000Z",
}

const stat: CheckStatDto = {
  checkedAt: "2026-10-14T15:15:00.000Z",
  isUp: false,
  responseTimeMs: 12.5,
  minResponseTimeMs: 10,
  maxResponseTimeMs: 15,
  checks: 3,
  upChecks: 2,
}

const test = baseTest
  .extend("checksService", () => ({
    findMonitor: vi.fn<ChecksService["findMonitor"]>(),
    getTodayStats: vi.fn<ChecksService["getTodayStats"]>(),
    getWeekStats: vi.fn<ChecksService["getWeekStats"]>(),
    getMonthStats: vi.fn<ChecksService["getMonthStats"]>(),
    getYearStats: vi.fn<ChecksService["getYearStats"]>(),
    findAll: vi.fn<ChecksService["findAll"]>(),
    createCheck: vi.fn<ChecksService["createCheck"]>(),
  }))
  .extend("controller", async ({ checksService }) => {
    const module = await Test.createTestingModule({
      controllers: [ChecksController],
      providers: [{ provide: ChecksService, useValue: checksService }],
    }).compile()

    return module.get(ChecksController)
  })

describe("ChecksController", () => {
  test("should be defined", ({ controller }) => {
    expect(controller).toBeDefined()
  })

  describe("findSinceDays", () => {
    const statsMethods = [
      ["today", "getTodayStats"],
      ["week", "getWeekStats"],
      ["month", "getMonthStats"],
      ["year", "getYearStats"],
    ] as const

    test.for(statsMethods)(
      "returns the checks of the %s using %s",
      async ([detail, method], { checksService, controller }) => {
        checksService.findMonitor.mockResolvedValueOnce(found)
        checksService[method].mockResolvedValueOnce([stat])

        const result = await controller.findSinceDays(
          "monitor-1",
          { detail },
          session,
        )

        expect(checksService.findMonitor).toHaveBeenCalledExactlyOnceWith(
          "monitor-1",
        )
        expect(checksService[method]).toHaveBeenCalledExactlyOnceWith(
          "monitor-1",
        )
        for (const [, other] of statsMethods) {
          if (other !== method) {
            expect(checksService[other]).not.toHaveBeenCalled()
          }
        }
        expect(result).toEqual([stat])
      },
    )

    test("throws NotFoundException and skips the read when the monitor belongs to another user", async ({
      checksService,
      controller,
    }) => {
      checksService.findMonitor.mockResolvedValueOnce({
        ...found,
        ownedBy: "user-2",
      })

      await expect(
        controller.findSinceDays("monitor-1", { detail: "week" }, session),
      ).rejects.toBeInstanceOf(NotFoundException)
      expect(checksService.getWeekStats).not.toHaveBeenCalled()
    })

    test("propagates NotFoundException when the monitor does not exist", async ({
      checksService,
      controller,
    }) => {
      checksService.findMonitor.mockRejectedValueOnce(new NotFoundException())

      await expect(
        controller.findSinceDays("missing", { detail: "week" }, session),
      ).rejects.toBeInstanceOf(NotFoundException)
      expect(checksService.getWeekStats).not.toHaveBeenCalled()
    })

    test("propagates service errors", async ({ checksService, controller }) => {
      checksService.findMonitor.mockResolvedValueOnce(found)
      checksService.getWeekStats.mockRejectedValueOnce(
        new InternalServerErrorException(),
      )

      await expect(
        controller.findSinceDays("monitor-1", { detail: "week" }, session),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
    })
  })

  describe("findAll", () => {
    const page = {
      data: [{ ...createdCheck, monitorId: "monitor-1" }],
      meta: { nextCursor: null, size: 1 },
    }

    test("returns the page of checks of the user's monitor", async ({
      checksService,
      controller,
    }) => {
      checksService.findAll.mockResolvedValueOnce(page)

      const result = await controller.findAll(
        { cursor: undefined },
        { monitorId: "monitor-1" },
        session,
      )

      expect(checksService.findAll).toHaveBeenCalledExactlyOnceWith(
        session,
        "monitor-1",
        undefined,
      )
      expect(result).toEqual(page)
    })

    test("passes the decoded cursor to the service", async ({
      checksService,
      controller,
    }) => {
      const cursor = { checkedAt: "2026-09-30T00:00:01.000Z", id: "check-1" }
      checksService.findAll.mockResolvedValueOnce(page)

      await controller.findAll({ cursor }, { monitorId: "monitor-1" }, session)

      expect(checksService.findAll).toHaveBeenCalledExactlyOnceWith(
        session,
        "monitor-1",
        cursor,
      )
    })

    test("propagates service errors", async ({ checksService, controller }) => {
      checksService.findAll.mockRejectedValueOnce(
        new InternalServerErrorException(),
      )

      await expect(
        controller.findAll(
          { cursor: undefined },
          { monitorId: "monitor-1" },
          session,
        ),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
    })
  })

  describe("createCheck", () => {
    test("creates a check for the monitor and returns it", async ({
      checksService,
      controller,
    }) => {
      checksService.findMonitor.mockResolvedValueOnce(found)
      checksService.createCheck.mockResolvedValueOnce(createdCheck)

      const result = await controller.createCheck("monitor-1", session)

      expect(checksService.findMonitor).toHaveBeenCalledExactlyOnceWith(
        "monitor-1",
      )
      expect(checksService.createCheck).toHaveBeenCalledExactlyOnceWith(
        "monitor-1",
      )
      expect(result).toEqual(createdCheck)
    })

    test("throws NotFoundException and skips the check when the monitor belongs to another user", async ({
      checksService,
      controller,
    }) => {
      checksService.findMonitor.mockResolvedValueOnce({
        ...found,
        ownedBy: "user-2",
      })

      await expect(
        controller.createCheck("monitor-1", session),
      ).rejects.toBeInstanceOf(NotFoundException)
      expect(checksService.createCheck).not.toHaveBeenCalled()
    })

    test("propagates NotFoundException when the monitor does not exist", async ({
      checksService,
      controller,
    }) => {
      checksService.findMonitor.mockRejectedValueOnce(new NotFoundException())

      await expect(
        controller.createCheck("missing", session),
      ).rejects.toBeInstanceOf(NotFoundException)
      expect(checksService.createCheck).not.toHaveBeenCalled()
    })

    test("propagates service errors", async ({ checksService, controller }) => {
      checksService.findMonitor.mockResolvedValueOnce(found)
      checksService.createCheck.mockRejectedValueOnce(
        new InternalServerErrorException(),
      )

      await expect(
        controller.createCheck("monitor-1", session),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
    })
  })
})
