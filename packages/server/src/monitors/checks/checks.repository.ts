import { Injectable } from "@nestjs/common"
import { and, desc, eq, gte, sql } from "drizzle-orm"
import { db } from "../../db/index.js"
import { check, InsertCheck } from "../../db/schema.js"
import { MonitorDetailDto } from "../dto/monitor.dto.js"
import type { StatsBucket } from "./dto/find-check.dto.js"

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

  // Agrupa los checks desde `since` en intervalos de `bucket` alineados con
  // `since`, del más reciente al más antiguo.
  async findStatsSince(
    id: MonitorDetailDto["id"],
    since: Date,
    bucket: StatsBucket,
  ) {
    const rows = await db
      .select({
        checkedAt: sql<
          Date | string
        >`date_bin(${bucket}::interval, ${check.checkedAt}, ${since.toISOString()}::timestamptz)`,
        isUp: sql<boolean>`bool_and(${check.isUp})`,
        responseTimeMs: sql<number>`avg(${check.responseTimeMs})::float8`,
        minResponseTimeMs: sql<number>`min(${check.responseTimeMs})::float8`,
        maxResponseTimeMs: sql<number>`max(${check.responseTimeMs})::float8`,
        checks: sql<number>`count(*)::int`,
        upChecks: sql<number>`(count(*) filter (where ${check.isUp}))::int`,
      })
      .from(check)
      .where(
        and(eq(check.monitorId, id), gte(check.checkedAt, since.toISOString())),
      )
      // Por posición: el intervalo va como parámetro y Postgres no reconoce
      // como iguales dos expresiones con parámetros distintos.
      .groupBy(sql`1`)
      .orderBy(sql`1 desc`)

    // `date_bin` no pasa por el codec de los timestamptz.
    return rows.map((row) => ({
      ...row,
      checkedAt: new Date(row.checkedAt).toISOString(),
    }))
  }

  async create(values: InsertCheck) {
    const [result] = await db
      .insert(check)
      .values(values)
      .returning(checkColumns)
    return result
  }
}
