import { InjectQueue } from "@nestjs/bullmq"
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common"
import { Queue } from "bullmq"
import { eq } from "drizzle-orm"
import { db } from "../db/index.js"
import { check, monitor } from "../db/schema.js"
import { UptimeService } from "../uptime/uptime.service.js"
import { ActivateMonitorSchedulerDto } from "./dto/activate-monitor-scheduler.dto.js"
import { CreateMonitorDto } from "./dto/create-monitor.dto.js"
import { DeleteMonitorDto } from "./dto/delete-monitor.dto.js"
import { GetMonitorDto } from "./dto/get-monitor.dto.js"
import { ListMonitorsDto } from "./dto/list-monitors.dto.js"
import { MonitorDetailDto, MonitorListDto } from "./dto/monitor.dto.js"
import { RunMonitorDto } from "./dto/run-monitor.dto.js"
import {
  MONITORS_QUEUE,
  monitorSchedulerId,
  RunMonitorJobData,
} from "./monitors.queue.js"

const LAST_CHECKS_LIMIT = 5

@Injectable()
export class MonitorsService {
  constructor(
    @InjectQueue(MONITORS_QUEUE)
    private readonly monitorsQueue: Queue<RunMonitorJobData>,
    private readonly uptimeService: UptimeService,
  ) {}

  private async getMonitorScheduler(monitorId: string) {
    try {
      return await this.monitorsQueue.getJobScheduler(
        monitorSchedulerId(monitorId),
      )
    } catch {
      throw new InternalServerErrorException(
        `Failed to get a monitor scheduler for monitor ${monitorId}`,
      )
    }
  }

  private async deleteMonitorScheduler(monitorId: string) {
    try {
      await this.monitorsQueue.removeJobScheduler(monitorSchedulerId(monitorId))
    } catch {
      throw new InternalServerErrorException(
        `Failed to delete a monitor scheduler for monitor ${monitorId}`,
      )
    }
  }

  private async upsertMonitorScheduler(
    monitorId: string,
    executeEveryMinutes: number,
  ) {
    try {
      await this.monitorsQueue.upsertJobScheduler(
        monitorSchedulerId(monitorId),
        {
          every: executeEveryMinutes * 60 * 1000,
        },
        {
          data: {
            monitorId,
          },
        },
      )
    } catch {
      throw new InternalServerErrorException(
        `Failed to setup a monitor scheduler for monitor ${monitorId}`,
      )
    }
  }

  async createMonitor({
    ownedBy,
    webPage,
    name,
    executeEveryMinutes,
  }: CreateMonitorDto): Promise<MonitorDetailDto> {
    let createdMonitor: MonitorDetailDto

    try {
      const [result] = await db
        .insert(monitor)
        .values({
          ownedBy,
          webPage,
          name,
          executeEveryMinutes,
        })
        .returning({
          id: monitor.id,
          name: monitor.name,
          webPage: monitor.webPage,
          createdAt: monitor.createdAt,
          ownedBy: monitor.ownedBy,
          executeEveryMinutes: monitor.executeEveryMinutes,
        })

      if (!result) {
        throw new InternalServerErrorException("Failed to create monitor")
      }

      createdMonitor = { ...result, checks: [], hasScheduler: false }
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error
      }

      throw new InternalServerErrorException(`Failed to create monitor`)
    }

    await this.upsertMonitorScheduler(
      createdMonitor.id,
      createdMonitor.executeEveryMinutes,
    )

    return { ...createdMonitor, hasScheduler: true }
  }

  async getMonitor({ id }: GetMonitorDto): Promise<MonitorDetailDto> {
    const scheduler = await this.getMonitorScheduler(id)

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

    return {
      ...result,
      hasScheduler: !!scheduler,
    }
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

    try {
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
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error
      }

      throw new InternalServerErrorException(`Failed to save check result`)
    }
  }

  async deleteMonitor({ id }: DeleteMonitorDto): Promise<void> {
    await this.deleteMonitorScheduler(id)

    const deletion = await db.delete(monitor).where(eq(monitor.id, id))

    if (deletion.rowCount === 0) throw new NotFoundException()
  }

  async activateMonitorScheduler({
    id,
    executeEveryMinutes,
  }: ActivateMonitorSchedulerDto) {
    const scheduler = await this.getMonitorScheduler(id)
    if (scheduler) return

    await this.upsertMonitorScheduler(id, executeEveryMinutes)
  }

  async deactivateMonitorScheduler({ id }: ActivateMonitorSchedulerDto) {
    const scheduler = await this.getMonitorScheduler(id)
    if (!scheduler) return

    await this.deleteMonitorScheduler(id)
  }
}
