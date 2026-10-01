import { InternalServerErrorException, NotFoundException } from "@nestjs/common"
import { Test } from "@nestjs/testing"
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
import { MonitorsService } from "./monitors.service.js"

const { dbMock, returning, values } = vi.hoisted(() => {
  const returning = vi.fn()
  const values = vi.fn(() => ({ returning }))

  return {
    returning,
    values,
    dbMock: {
      insert: vi.fn(() => ({ values })),
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
  .extend("service", async ({ uptimeService }) => {
    const module = await Test.createTestingModule({
      providers: [
        MonitorsService,
        { provide: UptimeService, useValue: uptimeService },
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
    }

    test("inserts the monitor and returns the created row", async ({
      db,
      service,
    }) => {
      const created: Omit<MonitorDetailDto, "checks"> = {
        id: MONITOR_ID,
        name: input.name,
        webPage: input.webPage,
        createdAt: "2026-09-30T00:00:00.000Z",
        ownedBy: input.ownedBy,
      }
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
      })
      expect(result).toEqual(expect.schemaMatching(monitorDetailSchema))
      expect(result).toEqual<MonitorDetailDto>({ ...created, checks: [] })
    })

    test("throws InternalServerErrorException when nothing is returned", async ({
      service,
    }) => {
      returning.mockResolvedValueOnce([])

      await expect(service.createMonitor(input)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      )
    })
  })

  describe("getMonitor", () => {
    test("returns the monitor with its last 5 checks", async ({
      db,
      service,
    }) => {
      const found: MonitorDetailDto = {
        id: MONITOR_ID,
        name: "Example",
        webPage: "https://example.com",
        ownedBy: "user-1",
        createdAt: "2026-09-30T00:00:00.000Z",
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
      db.query.monitor.findFirst.mockResolvedValueOnce(found)

      const result = await service.getMonitor({ id: MONITOR_ID })

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
      expect(result).toEqual(found)
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
    const found: MonitorDetailDto = {
      id: MONITOR_ID,
      name: "Example",
      webPage: "https://example.com",
      ownedBy: "user-1",
      createdAt: "2026-09-30T00:00:00.000Z",
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
      const foundWithFullHistory: MonitorDetailDto = {
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
  })
})
