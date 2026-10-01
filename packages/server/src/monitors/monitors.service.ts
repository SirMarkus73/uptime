import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common"
import { db } from "../db/index.js"
import { check, monitor } from "../db/schema.js"
import { UptimeService } from "../uptime/uptime.service.js"
import { CreateMonitorDto } from "./dto/create-monitor.dto.js"
import { GetMonitorDto } from "./dto/get-monitor.dto.js"
import { ListMonitorsDto } from "./dto/list-monitors.dto.js"
import { MonitorDetailDto, MonitorListDto } from "./dto/monitor.dto.js"
import { RunMonitorDto } from "./dto/run-monitor.dto.js"

const LAST_CHECKS_LIMIT = 5

@Injectable()
export class MonitorsService {
  constructor(private readonly uptimeService: UptimeService) {}

  async createMonitor({
    ownedBy,
    webPage,
    name,
  }: CreateMonitorDto): Promise<MonitorDetailDto> {
    const [result] = await db
      .insert(monitor)
      .values({
        ownedBy,
        webPage,
        name,
      })
      .returning({
        id: monitor.id,
        name: monitor.name,
        webPage: monitor.webPage,
        createdAt: monitor.createdAt,
        ownedBy: monitor.ownedBy,
      })

    if (!result) {
      throw new InternalServerErrorException()
    }

    return { ...result, checks: [] }
  }

  async getMonitor({ id }: GetMonitorDto): Promise<MonitorDetailDto> {
    const result = await db.query.monitor.findFirst({
      where: {
        id,
      },
      with: {
        checks: {
          limit: LAST_CHECKS_LIMIT,
          orderBy: {
            checkedAt: "desc",
          },
        },
      },
    })

    if (!result) {
      throw new NotFoundException()
    }

    return result
  }

  async listMonitors({ ownedBy }: ListMonitorsDto): Promise<MonitorListDto> {
    const monitors = await db.query.monitor.findMany({
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

    return monitors
  }

  async runMonitor({ id }: RunMonitorDto): Promise<MonitorDetailDto> {
    const monitor = await this.getMonitor({ id })

    const checkResult = await this.uptimeService.checkState(monitor.webPage)

    const [checkInsertResult] = await db
      .insert(check)
      .values({ ...checkResult, monitorId: id })
      .returning({
        id: check.id,
        isUp: check.isUp,
        statusCode: check.statusCode,
        responseTimeMs: check.responseTimeMs,
        checkedAt: check.checkedAt,
        errorCode: check.errorCode,
      })

    if (!checkInsertResult) {
      throw new InternalServerErrorException()
    }

    return {
      ...monitor,
      checks: [
        checkInsertResult,
        ...monitor.checks.slice(0, LAST_CHECKS_LIMIT - 1),
      ],
    }
  }
}
