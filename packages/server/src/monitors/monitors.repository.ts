import { Injectable } from "@nestjs/common"
import { eq } from "drizzle-orm"
import { db } from "../db/index.js"
import { InsertMonitor, monitor, SelectMonitor } from "../db/schema.js"
import { MonitorDetailDto } from "./dto/monitor.dto.js"

@Injectable()
export class MonitorsRepository {
  async find(id: MonitorDetailDto["id"]) {
    return await db.query.monitor.findFirst({ where: { id } })
  }

  async findMany(ownedBy: SelectMonitor["ownedBy"]) {
    return await db.query.monitor.findMany({ where: { ownedBy } })
  }

  async findManyWithLastCheck(ownedBy: SelectMonitor["ownedBy"]) {
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
          orderBy: {
            checkedAt: "desc",
          },
        },
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
