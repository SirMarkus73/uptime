import { NotFoundException } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import type { UserSession } from "@thallesp/nestjs-better-auth"
import { test as baseTest } from "vitest"
import { MonitorDetailDto, MonitorListDto } from "./dto/monitor.dto.js"
import { MonitorsController } from "./monitors.controller.js"
import { MonitorsService } from "./monitors.service.js"

const session = { user: { id: "user-1" } } as UserSession

const test = baseTest
  .extend("monitorsService", () => ({
    createMonitor: vi.fn<MonitorsService["createMonitor"]>(),
    runMonitor: vi.fn<MonitorsService["runMonitor"]>(),
    getMonitor: vi.fn<MonitorsService["getMonitor"]>(),
    listMonitors: vi.fn<MonitorsService["listMonitors"]>(),
    deleteMonitor: vi.fn<MonitorsService["deleteMonitor"]>(),
  }))
  .extend("controller", async ({ monitorsService }) => {
    const module = await Test.createTestingModule({
      controllers: [MonitorsController],
      providers: [{ provide: MonitorsService, useValue: monitorsService }],
    }).compile()

    return module.get(MonitorsController)
  })

describe("MonitorsController", () => {
  test("should be defined", ({ controller }) => {
    expect(controller).toBeDefined()
  })

  describe("createMonitor", () => {
    test("creates the monitor owned by the session user", async ({
      monitorsService,
      controller,
    }) => {
      const created: MonitorDetailDto = {
        id: "monitor-1",
        name: "Example",
        webPage: "https://example.com",
        createdAt: "2026-09-30T00:00:00.000Z",
        ownedBy: "user-1",
        checks: [],
      }
      monitorsService.createMonitor.mockResolvedValueOnce(created)

      const result = await controller.createMonitor(session, {
        name: "Example",
        webPage: "https://example.com",
      })

      expect(monitorsService.createMonitor).toHaveBeenCalledExactlyOnceWith({
        ownedBy: "user-1",
        name: "Example",
        webPage: "https://example.com",
      })
      expect(result).toEqual(created)
    })
  })

  describe("runMonitor", () => {
    const found: MonitorDetailDto = {
      id: "monitor-1",
      name: "Example",
      webPage: "https://example.com",
      createdAt: "2026-09-30T00:00:00.000Z",
      ownedBy: "user-1",
      checks: [],
    }

    test("runs the monitor and returns it with the new check", async ({
      monitorsService,
      controller,
    }) => {
      const ranMonitor: MonitorDetailDto = {
        ...found,
        checks: [
          {
            id: "check-1",
            isUp: true,
            statusCode: 200,
            responseTimeMs: 12.5,
            errorCode: null,
            checkedAt: "2026-09-30T00:00:01.000Z",
          },
        ],
      }
      monitorsService.getMonitor.mockResolvedValueOnce(found)
      monitorsService.runMonitor.mockResolvedValueOnce(ranMonitor)

      const result = await controller.runMonitor("monitor-1", session)

      expect(monitorsService.getMonitor).toHaveBeenCalledExactlyOnceWith({
        id: "monitor-1",
      })
      expect(monitorsService.runMonitor).toHaveBeenCalledExactlyOnceWith({
        id: "monitor-1",
      })
      expect(result).toEqual(ranMonitor)
    })

    test("throws NotFoundException and skips the run when the monitor belongs to another user", async ({
      monitorsService,
      controller,
    }) => {
      monitorsService.getMonitor.mockResolvedValueOnce({
        ...found,
        ownedBy: "user-2",
      })

      await expect(
        controller.runMonitor("monitor-1", session),
      ).rejects.toBeInstanceOf(NotFoundException)
      expect(monitorsService.runMonitor).not.toHaveBeenCalled()
    })

    test("propagates service errors and skips the run", async ({
      monitorsService,
      controller,
    }) => {
      monitorsService.getMonitor.mockRejectedValueOnce(new NotFoundException())

      await expect(
        controller.runMonitor("missing", session),
      ).rejects.toBeInstanceOf(NotFoundException)
      expect(monitorsService.runMonitor).not.toHaveBeenCalled()
    })
  })

  describe("getMonitor", () => {
    test("returns the requested monitor", async ({
      monitorsService,
      controller,
    }) => {
      const found: MonitorDetailDto = {
        id: "monitor-1",
        name: "Example",
        webPage: "https://example.com",
        createdAt: "2026-09-30T00:00:00.000Z",
        ownedBy: "user-1",
        checks: [],
      }
      monitorsService.getMonitor.mockResolvedValueOnce(found)

      const result = await controller.getMonitor("monitor-1", session)

      expect(monitorsService.getMonitor).toHaveBeenCalledExactlyOnceWith({
        id: "monitor-1",
      })
      expect(result).toEqual(found)
    })

    test("throws NotFoundException when the monitor belongs to another user", async ({
      monitorsService,
      controller,
    }) => {
      monitorsService.getMonitor.mockResolvedValueOnce({
        id: "monitor-1",
        name: "Example",
        webPage: "https://example.com",
        createdAt: "2026-09-30T00:00:00.000Z",
        ownedBy: "user-2",
        checks: [],
      })

      await expect(
        controller.getMonitor("monitor-1", session),
      ).rejects.toBeInstanceOf(NotFoundException)
    })

    test("propagates service errors", async ({
      monitorsService,
      controller,
    }) => {
      monitorsService.getMonitor.mockRejectedValueOnce(new NotFoundException())

      await expect(
        controller.getMonitor("missing", session),
      ).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe("listMonitors", () => {
    test("lists the monitors owned by the session user", async ({
      monitorsService,
      controller,
    }) => {
      const monitors: MonitorListDto = [
        {
          id: "monitor-1",
          name: "Example",
          webPage: "https://example.com",
          createdAt: "2026-09-30T00:00:00.000Z",
          ownedBy: "user-1",
          isUp: true,
        },
      ]
      monitorsService.listMonitors.mockResolvedValueOnce(monitors)

      const result = await controller.listMonitors(session)

      expect(monitorsService.listMonitors).toHaveBeenCalledExactlyOnceWith({
        ownedBy: "user-1",
      })
      expect(result).toEqual(monitors)
    })
  })

  describe("deleteMonitor", () => {
    const found: MonitorDetailDto = {
      id: "monitor-1",
      name: "Example",
      webPage: "https://example.com",
      createdAt: "2026-09-30T00:00:00.000Z",
      ownedBy: "user-1",
      checks: [],
    }

    test("deletes the monitor owned by the session user", async ({
      monitorsService,
      controller,
    }) => {
      monitorsService.getMonitor.mockResolvedValueOnce(found)
      monitorsService.deleteMonitor.mockResolvedValueOnce()

      const result = await controller.deleteMonitor("monitor-1", session)

      expect(monitorsService.getMonitor).toHaveBeenCalledExactlyOnceWith({
        id: "monitor-1",
      })
      expect(monitorsService.deleteMonitor).toHaveBeenCalledExactlyOnceWith({
        id: "monitor-1",
      })
      expect(result).toBeUndefined()
    })

    test("throws NotFoundException and skips the delete when the monitor belongs to another user", async ({
      monitorsService,
      controller,
    }) => {
      monitorsService.getMonitor.mockResolvedValueOnce({
        ...found,
        ownedBy: "user-2",
      })

      await expect(
        controller.deleteMonitor("monitor-1", session),
      ).rejects.toBeInstanceOf(NotFoundException)
      expect(monitorsService.deleteMonitor).not.toHaveBeenCalled()
    })

    test("propagates service errors and skips the delete", async ({
      monitorsService,
      controller,
    }) => {
      monitorsService.getMonitor.mockRejectedValueOnce(new NotFoundException())

      await expect(
        controller.deleteMonitor("missing", session),
      ).rejects.toBeInstanceOf(NotFoundException)
      expect(monitorsService.deleteMonitor).not.toHaveBeenCalled()
    })
  })
})
