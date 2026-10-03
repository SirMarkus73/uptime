import { Injectable } from "@nestjs/common"
import { eq } from "drizzle-orm"
import { db } from "../db/index.js"
import { check, InsertMonitor, monitor, SelectMonitor } from "../db/schema.js"
import { MonitorDetailDto } from "./dto/monitor.dto.js"

@Injectable()
export class MonitorsRepository {
  async find(id: MonitorDetailDto["id"]) {
    return await db.query.monitor.findFirst({ where: { id } })
  }

  async findWithChecks(id: MonitorDetailDto["id"], maximumChecks = 5) {
    return await db.query.monitor.findFirst({
      where: { id },
      with: {
        checks: {
          limit: maximumChecks,
          orderBy: {
            checkedAt: "desc",
          },
        },
      },
    })
  }

  async findMany(ownedBy: SelectMonitor["ownedBy"]) {
    return await db.query.monitor.findMany({ where: { ownedBy } })
  }

  async findManyWithStatus(ownedBy: SelectMonitor["ownedBy"]) {
    return await db.query.monitor.findMany({
      columns: {
        id: true,
        name: true,
        createdAt: true,
        ownedBy: true,
        webPage: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      where: {
        ownedBy,
      },
      extras: {
        isUp: (m, { sql }) =>
          sql<boolean | null>`SELECT ${check.isUp} 
                FROM ${check} 
                WHERE ${check.monitorId} = ${m.id} 
                ORDER BY ${check.checkedAt} DESC 
                LIMIT 1
                `,
      },
    })
  }

  async destroyMonitor(id: SelectMonitor["id"]) {
    await db.delete(monitor).where(eq(monitor.id, id))
  }

  async create(values: InsertMonitor) {
    const [result] = await db.insert(monitor).values(values).returning()
    return result
  }
}
