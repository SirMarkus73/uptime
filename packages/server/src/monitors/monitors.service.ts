import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common"
import { db } from "../db/index.js"
import { check, monitor } from "../db/schema.js"
import { UptimeService } from "../uptime/uptime.service.js"
import {
  CreateMonitorDto,
  CreateMonitorResponseDto,
} from "./dto/create-monitor.dto.js"
import { GetMonitorDto, GetMonitorResultDto } from "./dto/get-monitor.dto.js"
import {
  ListMonitorsDto,
  ListMonitorsResponseDto,
} from "./dto/list-monitors.dto.js"
import { RunMonitorDto, RunMonitorResultDto } from "./dto/run-monitor.dto.js"

@Injectable()
export class MonitorsService {
  constructor(private readonly uptimeService: UptimeService) {}

  async createMonitor({
    ownedBy,
    webPage,
    name,
  }: CreateMonitorDto): Promise<CreateMonitorResponseDto> {
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
      })

    if (!result) {
      throw new InternalServerErrorException()
    }

    return result
  }

  async getMonitor({ id }: GetMonitorDto): Promise<GetMonitorResultDto> {
    const result = await db.query.monitor.findFirst({
      where: {
        id,
      },
      with: {
        checks: {
          limit: 5,
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

  async listMonitors({
    ownedBy,
  }: ListMonitorsDto): Promise<ListMonitorsResponseDto> {
    const monitors = await db.query.monitor.findMany({
      columns: {
        ownedBy: false,
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

  async runMonitor({ id }: RunMonitorDto): Promise<RunMonitorResultDto> {
    const monitor = await db.query.monitor.findFirst({ where: { id } })

    if (!monitor) {
      throw new NotFoundException()
    }

    const checkResult = await this.uptimeService.checkState(monitor.webPage)

    const [checkInsertResult] = await db
      .insert(check)
      .values({ ...checkResult, monitorId: id })
      .returning()

    if (!checkInsertResult) {
      throw new InternalServerErrorException()
    }

    return checkInsertResult
  }
}
