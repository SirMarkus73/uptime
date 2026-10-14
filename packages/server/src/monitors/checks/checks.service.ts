import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common"
import type { UserSession } from "@thallesp/nestjs-better-auth"
import { startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns"
import { sql } from "drizzle-orm"
import { db } from "../../db/index.js"
import { UptimeService } from "../../uptime/uptime.service.js"
import { MonitorDetailDto, MonitorIdFieldDto } from "../dto/monitor.dto.js"
import { MonitorsRepository } from "../monitors.repository.js"
import { ChecksRepository } from "./checks.repository.js"
import { CheckDto } from "./dto/check.dto.js"
import {
  type ChecksCursorDto,
  encodeChecksCursor,
  FIND_ALL_PAGE_SIZE,
  type FindAllChecksDto,
} from "./dto/find-all.dto.js"
import {
  type CheckStatListDto,
  STATS_BUCKETS,
  type StatsBucket,
} from "./dto/find-check.dto.js"

@Injectable()
export class ChecksService {
  constructor(
    private readonly checksRepository: ChecksRepository,
    private readonly monitorsRepository: MonitorsRepository,
    private readonly uptimeService: UptimeService,
  ) {}

  async findMonitor(id: MonitorDetailDto["id"]) {
    let monitor = null

    try {
      monitor = await this.monitorsRepository.find(id)
    } catch {
      throw new InternalServerErrorException()
    }

    if (!monitor) throw new NotFoundException()

    return monitor
  }

  async findAll(
    session: UserSession,
    monitorId: MonitorIdFieldDto,
    cursor?: ChecksCursorDto,
  ): Promise<FindAllChecksDto> {
    const { user } = session

    const checks = await db.query.check
      .findMany({
        where: {
          monitorId,
          monitor: {
            ownedBy: user.id,
          },
          ...(cursor && {
            OR: [
              { checkedAt: { lt: cursor.checkedAt } },
              { checkedAt: cursor.checkedAt, id: { lte: cursor.id } },
            ],
          }),
        },
        orderBy: {
          checkedAt: "desc",
          id: "desc",
        },
        // `checkedAt` sale redondeado a milisegundos (ver `db/index.ts`), pero
        // Postgres lo guarda con microsegundos. El cursor necesita la fecha
        // exacta: con la redondeada se saltaría el check que lo abre.
        extras: {
          cursorCheckedAt: (t) =>
            sql<string>`to_char(${t.checkedAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
        },
        limit: FIND_ALL_PAGE_SIZE + 1,
      })
      .catch(() => {
        throw new InternalServerErrorException()
      })

    const next = checks.at(FIND_ALL_PAGE_SIZE)
    const nextCursor = next
      ? encodeChecksCursor({ checkedAt: next.cursorCheckedAt, id: next.id })
      : null

    const data = checks
      .slice(0, FIND_ALL_PAGE_SIZE)
      .map(({ cursorCheckedAt: _, ...check }) => check)

    return {
      data,
      meta: {
        nextCursor,
        size: data.length,
      },
    }
  }

  // Los periodos son de calendario (no ventanas móviles) y se calculan en la
  // zona horaria del servidor; la semana empieza el lunes.
  async getTodayStats(id: MonitorDetailDto["id"]): Promise<CheckStatListDto> {
    return this.findStatsSince(id, startOfDay(new Date()), STATS_BUCKETS.today)
  }

  async getWeekStats(id: MonitorDetailDto["id"]): Promise<CheckStatListDto> {
    return this.findStatsSince(
      id,
      startOfWeek(new Date(), { weekStartsOn: 1 }),
      STATS_BUCKETS.week,
    )
  }

  async getMonthStats(id: MonitorDetailDto["id"]): Promise<CheckStatListDto> {
    return this.findStatsSince(
      id,
      startOfMonth(new Date()),
      STATS_BUCKETS.month,
    )
  }

  async getYearStats(id: MonitorDetailDto["id"]): Promise<CheckStatListDto> {
    return this.findStatsSince(id, startOfYear(new Date()), STATS_BUCKETS.year)
  }

  private async findStatsSince(
    id: MonitorDetailDto["id"],
    since: Date,
    bucket: StatsBucket,
  ): Promise<CheckStatListDto> {
    try {
      return await this.checksRepository.findStatsSince(id, since, bucket)
    } catch {
      throw new InternalServerErrorException()
    }
  }

  async createCheck(id: MonitorDetailDto["id"]): Promise<CheckDto> {
    const monitor = await this.findMonitor(id)

    const checkResult = await this.uptimeService.checkState(monitor.webPage)

    let createdCheck = null

    try {
      createdCheck = await this.checksRepository.create({
        ...checkResult,
        monitorId: id,
      })
    } catch {
      throw new InternalServerErrorException(`Failed to save check result`)
    }

    if (!createdCheck) {
      throw new InternalServerErrorException(`Failed to save check result`)
    }

    return createdCheck
  }
}
