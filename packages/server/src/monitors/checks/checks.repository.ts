import { Injectable } from "@nestjs/common"
import { sub } from "date-fns"
import { and, desc, eq, gt } from "drizzle-orm"
import { db } from "../../db/index.js"
import { check, InsertCheck } from "../../db/schema.js"
import { MonitorDetailDto } from "../dto/monitor.dto.js"

// Columnas que se exponen de un check (ver checkSchema).
const checkColumns = {
  id: check.id,
  isUp: check.isUp,
  statusCode: check.statusCode,
  responseTimeMs: check.responseTimeMs,
  checkedAt: check.checkedAt,
  errorCode: check.errorCode,
}

@Injectable()
export class ChecksRepository {
  async findLatest(id: MonitorDetailDto["id"]) {
    const [latest] = await db
      .select(checkColumns)
      .from(check)
      .where(eq(check.monitorId, id))
      .orderBy(desc(check.checkedAt))
      .limit(1)

    return latest
  }

  async findAllSinceDays(id: MonitorDetailDto["id"], days: number) {
    const since = sub(new Date(), { days }).toISOString()

    return await db
      .select(checkColumns)
      .from(check)
      .where(and(eq(check.monitorId, id), gt(check.checkedAt, since)))
      .orderBy(desc(check.checkedAt))
  }

  async create(values: InsertCheck) {
    const [result] = await db
      .insert(check)
      .values(values)
      .returning(checkColumns)
    return result
  }
}
