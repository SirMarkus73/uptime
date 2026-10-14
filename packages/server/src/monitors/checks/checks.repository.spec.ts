import { Test } from "@nestjs/testing"
import { and, desc, eq, gte } from "drizzle-orm"
import { test as baseTest } from "vitest"
import { check } from "../../db/schema.js"
import { ChecksRepository } from "./checks.repository.js"
import type { CheckDto } from "./dto/check.dto.js"
import {
  type CheckStatDto,
  checkStatListSchema,
  checkStatSchema,
} from "./dto/find-check.dto.js"

const { dbMock, from, groupBy, limit, orderBy, returning, values, where } =
  vi.hoisted(() => {
    const returning = vi.fn()
    const values = vi.fn(() => ({ returning }))
    const limit = vi.fn()
    const orderBy = vi.fn()
    const groupBy = vi.fn(() => ({ orderBy }))
    const where = vi.fn(() => ({ orderBy, groupBy }))
    const from = vi.fn(() => ({ where }))

    return {
      from,
      groupBy,
      limit,
      orderBy,
      returning,
      values,
      where,
      dbMock: {
        insert: vi.fn(() => ({ values })),
        select: vi.fn(() => ({ from })),
      },
    }
  })

vi.mock("../../db/index.js", () => ({ db: dbMock }))

const MONITOR_ID = "8c5b3c1e-2f4a-4b8e-9d1a-3e6f7a8b9c0d"

const checkColumns = {
  id: check.id,
  isUp: check.isUp,
  statusCode: check.statusCode,
  responseTimeMs: check.responseTimeMs,
  checkedAt: check.checkedAt,
  errorCode: check.errorCode,
}

const stored: CheckDto = {
  id: "3f2e1d0c-9b8a-4c7d-8e6f-5a4b3c2d1e0f",
  isUp: true,
  statusCode: 200,
  responseTimeMs: 12.5,
  errorCode: null,
  checkedAt: "2026-10-07T11:00:00.000Z",
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
  // The db mock is module-level, so reset it before every test to avoid
  // leaking queued `*Once` values from a failed test into the next one.
  .extend("db", { auto: true }, () => {
    vi.resetAllMocks()
    return dbMock
  })
  .extend("repository", async () => {
    const module = await Test.createTestingModule({
      providers: [ChecksRepository],
    }).compile()

    return module.get(ChecksRepository)
  })

describe("ChecksRepository", () => {
  test("should be defined", ({ repository }) => {
    expect(repository).toBeDefined()
  })

  describe("findLatest", () => {
    test("returns the newest check of the monitor", async ({
      db,
      repository,
    }) => {
      orderBy.mockReturnValueOnce({ limit })
      limit.mockResolvedValueOnce([stored])

      const result = await repository.findLatest(MONITOR_ID)

      expect(db.select).toHaveBeenCalledExactlyOnceWith(checkColumns)
      expect(from).toHaveBeenCalledExactlyOnceWith(check)
      expect(where).toHaveBeenCalledExactlyOnceWith(
        eq(check.monitorId, MONITOR_ID),
      )
      expect(orderBy).toHaveBeenCalledExactlyOnceWith(desc(check.checkedAt))
      expect(limit).toHaveBeenCalledExactlyOnceWith(1)
      expect(result).toEqual(stored)
    })

    test("returns undefined when the monitor has no checks", async ({
      repository,
    }) => {
      orderBy.mockReturnValueOnce({ limit })
      limit.mockResolvedValueOnce([])

      await expect(repository.findLatest(MONITOR_ID)).resolves.toBeUndefined()
    })

    test("propagates database errors", async ({ repository }) => {
      const error = new Error("connection lost")
      orderBy.mockReturnValueOnce({ limit })
      limit.mockRejectedValueOnce(error)

      await expect(repository.findLatest(MONITOR_ID)).rejects.toBe(error)
    })
  })

  describe("findStatsSince", () => {
    const since = new Date("2026-10-14T00:00:00.000Z")

    test("groups the checks since the date into buckets, newest first", async ({
      db,
      repository,
    }) => {
      orderBy.mockResolvedValueOnce([
        { ...stat, checkedAt: "2026-10-14 15:15:00+00" },
      ])

      const result = await repository.findStatsSince(
        MONITOR_ID,
        since,
        "15 minutes",
      )

      expect(db.select).toHaveBeenCalledExactlyOnceWith(
        Object.fromEntries(
          Object.keys(checkStatSchema.shape).map((key) => [
            key,
            expect.anything(),
          ]),
        ),
      )
      expect(from).toHaveBeenCalledExactlyOnceWith(check)
      expect(where).toHaveBeenCalledExactlyOnceWith(
        and(
          eq(check.monitorId, MONITOR_ID),
          gte(check.checkedAt, "2026-10-14T00:00:00.000Z"),
        ),
      )
      expect(groupBy).toHaveBeenCalledOnce()
      expect(orderBy).toHaveBeenCalledOnce()
      expect(result).toEqual(expect.schemaMatching(checkStatListSchema))
      expect(result).toEqual([stat])
    })

    test("propagates database errors", async ({ repository }) => {
      const error = new Error("connection lost")
      orderBy.mockRejectedValueOnce(error)

      await expect(
        repository.findStatsSince(MONITOR_ID, since, "1 day"),
      ).rejects.toBe(error)
    })
  })

  describe("create", () => {
    const { id: _, ...checkResult } = stored

    test("inserts the check and returns it", async ({ db, repository }) => {
      returning.mockResolvedValueOnce([stored])

      const result = await repository.create({
        ...checkResult,
        monitorId: MONITOR_ID,
      })

      expect(db.insert).toHaveBeenCalledExactlyOnceWith(check)
      expect(values).toHaveBeenCalledExactlyOnceWith({
        ...checkResult,
        monitorId: MONITOR_ID,
      })
      expect(returning).toHaveBeenCalledExactlyOnceWith(checkColumns)
      expect(result).toEqual(stored)
    })

    test("returns undefined when nothing is inserted", async ({
      repository,
    }) => {
      returning.mockResolvedValueOnce([])

      await expect(
        repository.create({ ...checkResult, monitorId: MONITOR_ID }),
      ).resolves.toBeUndefined()
    })

    test("propagates database errors", async ({ repository }) => {
      const error = new Error("connection lost")
      returning.mockRejectedValueOnce(error)

      await expect(
        repository.create({ ...checkResult, monitorId: MONITOR_ID }),
      ).rejects.toBe(error)
    })
  })
})
