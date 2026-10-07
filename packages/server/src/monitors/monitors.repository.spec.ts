import { Test } from "@nestjs/testing"
import { eq } from "drizzle-orm"
import { test as baseTest } from "vitest"
import { monitor, type SelectMonitor } from "../db/schema.js"
import { MonitorsRepository } from "./monitors.repository.js"

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
const OWNER_ID = "user-1"

const stored: SelectMonitor = {
  id: MONITOR_ID,
  name: "Example",
  webPage: "https://example.com/",
  ownedBy: OWNER_ID,
  executeEveryMinutes: 5,
  createdAt: "2026-09-30T00:00:00.000Z",
}

const test = baseTest
  // The db mock is module-level, so reset it before every test to avoid
  // leaking queued `*Once` values from a failed test into the next one.
  .extend("db", { auto: true }, () => {
    vi.resetAllMocks()
    return dbMock
  })
  .extend("repository", async () => {
    const module = await Test.createTestingModule({
      providers: [MonitorsRepository],
    }).compile()

    return module.get(MonitorsRepository)
  })

describe("MonitorsRepository", () => {
  test("should be defined", ({ repository }) => {
    expect(repository).toBeDefined()
  })

  describe("find", () => {
    test("returns the monitor with the given id", async ({
      db,
      repository,
    }) => {
      db.query.monitor.findFirst.mockResolvedValueOnce(stored)

      const result = await repository.find(MONITOR_ID)

      expect(db.query.monitor.findFirst).toHaveBeenCalledExactlyOnceWith({
        where: { id: MONITOR_ID },
      })
      expect(result).toEqual(stored)
    })

    test("returns undefined when the monitor does not exist", async ({
      db,
      repository,
    }) => {
      db.query.monitor.findFirst.mockResolvedValueOnce(undefined)

      await expect(repository.find(MONITOR_ID)).resolves.toBeUndefined()
    })

    test("propagates database errors", async ({ db, repository }) => {
      const error = new Error("connection lost")
      db.query.monitor.findFirst.mockRejectedValueOnce(error)

      await expect(repository.find(MONITOR_ID)).rejects.toBe(error)
    })
  })

  describe("findMany", () => {
    test("returns the monitors owned by the user", async ({
      db,
      repository,
    }) => {
      db.query.monitor.findMany.mockResolvedValueOnce([stored])

      const result = await repository.findMany(OWNER_ID)

      expect(db.query.monitor.findMany).toHaveBeenCalledExactlyOnceWith({
        where: { ownedBy: OWNER_ID },
      })
      expect(result).toEqual([stored])
    })

    test("propagates database errors", async ({ db, repository }) => {
      const error = new Error("connection lost")
      db.query.monitor.findMany.mockRejectedValueOnce(error)

      await expect(repository.findMany(OWNER_ID)).rejects.toBe(error)
    })
  })

  describe("findManyWithLastCheck", () => {
    test("returns the monitors owned by the user, newest first, with their last check", async ({
      db,
      repository,
    }) => {
      const { executeEveryMinutes: _, ...listed } = stored
      const monitors = [
        {
          ...listed,
          checks: [
            {
              id: "3f2e1d0c-9b8a-4c7d-8e6f-5a4b3c2d1e0f",
              isUp: true,
              statusCode: 200,
              responseTimeMs: 12.5,
              errorCode: null,
              checkedAt: "2026-09-30T00:00:01.000Z",
            },
          ],
        },
      ]
      db.query.monitor.findMany.mockResolvedValueOnce(monitors)

      const result = await repository.findManyWithLastCheck(OWNER_ID)

      expect(db.query.monitor.findMany).toHaveBeenCalledExactlyOnceWith({
        columns: {
          id: true,
          name: true,
          createdAt: true,
          ownedBy: true,
          webPage: true,
        },
        orderBy: { createdAt: "desc" },
        where: { ownedBy: OWNER_ID },
        with: {
          checks: {
            columns: {
              id: true,
              isUp: true,
              statusCode: true,
              responseTimeMs: true,
              checkedAt: true,
              errorCode: true,
            },
            limit: 1,
            orderBy: { checkedAt: "desc" },
          },
        },
      })
      expect(result).toEqual(monitors)
    })

    test("propagates database errors", async ({ db, repository }) => {
      const error = new Error("connection lost")
      db.query.monitor.findMany.mockRejectedValueOnce(error)

      await expect(repository.findManyWithLastCheck(OWNER_ID)).rejects.toBe(
        error,
      )
    })
  })

  describe("destroyMonitor", () => {
    test("deletes the monitor with the given id", async ({
      db,
      repository,
    }) => {
      where.mockResolvedValueOnce({ rowCount: 1 })

      await expect(
        repository.destroyMonitor(MONITOR_ID),
      ).resolves.toBeUndefined()

      expect(db.delete).toHaveBeenCalledExactlyOnceWith(monitor)
      expect(where).toHaveBeenCalledExactlyOnceWith(eq(monitor.id, MONITOR_ID))
    })

    test("propagates database errors", async ({ repository }) => {
      const error = new Error("connection lost")
      where.mockRejectedValueOnce(error)

      await expect(repository.destroyMonitor(MONITOR_ID)).rejects.toBe(error)
    })
  })

  describe("create", () => {
    const input = {
      name: stored.name,
      webPage: stored.webPage,
      ownedBy: stored.ownedBy,
      executeEveryMinutes: stored.executeEveryMinutes,
    }

    test("inserts the monitor and returns the created row", async ({
      db,
      repository,
    }) => {
      returning.mockResolvedValueOnce([stored])

      const result = await repository.create(input)

      expect(db.insert).toHaveBeenCalledExactlyOnceWith(monitor)
      expect(values).toHaveBeenCalledExactlyOnceWith(input)
      expect(returning).toHaveBeenCalledExactlyOnceWith()
      expect(result).toEqual(stored)
    })

    test("returns undefined when nothing is returned", async ({
      repository,
    }) => {
      returning.mockResolvedValueOnce([])

      await expect(repository.create(input)).resolves.toBeUndefined()
    })

    test("propagates database errors", async ({ repository }) => {
      const error = new Error("connection lost")
      returning.mockRejectedValueOnce(error)

      await expect(repository.create(input)).rejects.toBe(error)
    })
  })
})
