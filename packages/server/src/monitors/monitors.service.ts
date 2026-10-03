import { InjectQueue } from "@nestjs/bullmq"
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common"
import { Queue } from "bullmq"
import { db } from "../db/index.js"
import { check } from "../db/schema.js"
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
import { MonitorsRepository } from "./monitors.repository.js"

@Injectable()
export class MonitorsService {
  constructor(
    @InjectQueue(MONITORS_QUEUE)
    private readonly monitorsQueue: Queue<RunMonitorJobData>,
    private readonly uptimeService: UptimeService,
    private readonly monitorRepository: MonitorsRepository,
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
      const result = await this.monitorRepository.create({
        ownedBy,
        webPage,
        name,
        executeEveryMinutes,
      })

      if (!result) {
        throw new InternalServerErrorException()
      }

      createdMonitor = { ...result, checks: [], hasScheduler: false }
    } catch {
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
    let monitor = null

    try {
      monitor = await this.monitorRepository.findWithChecks(id)
    } catch {
      throw new InternalServerErrorException()
    }

    if (!monitor) {
      throw new NotFoundException()
    }

    return {
      ...monitor,
      hasScheduler: !!scheduler,
    }
  }

  async listMonitors({ ownedBy }: ListMonitorsDto): Promise<MonitorListDto> {
    let monitors = null
    try {
      monitors = await this.monitorRepository.findManyWithStatus(ownedBy)
    } catch {
      throw new InternalServerErrorException()
    }
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
        checks: [checkInsertResult, ...monitor.checks.slice(0, 4)],
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
    try {
      await this.monitorRepository.destroyMonitor(id)
    } catch {
      throw new InternalServerErrorException()
    }
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
