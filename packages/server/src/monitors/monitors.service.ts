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
      with: {
        checks: {
          columns: {
            isUp: true,
          },
          limit: 1,
          orderBy: {
            checkedAt: "desc",
          },
        },
      },
    })

    return monitors.map((m) => ({
      createdAt: m.createdAt,
      id: m.id,
      isUp: m.checks[0]?.isUp === undefined ? null : m.checks[0].isUp,
      name: m.name,
      webPage: m.webPage,
    }))
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
