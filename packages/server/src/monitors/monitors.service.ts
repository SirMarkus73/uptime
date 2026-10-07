import { InjectQueue } from "@nestjs/bullmq"
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common"
import { Queue } from "bullmq"
import { ChecksRepository } from "./checks/checks.repository.js"
import { ActivateMonitorSchedulerDto } from "./dto/activate-monitor-scheduler.dto.js"
import { CreateMonitorDto } from "./dto/create-monitor.dto.js"
import { DeleteMonitorDto } from "./dto/delete-monitor.dto.js"
import { GetMonitorDto } from "./dto/get-monitor.dto.js"
import { ListMonitorsDto } from "./dto/list-monitors.dto.js"
import { MonitorDetailDto, MonitorListDto } from "./dto/monitor.dto.js"
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
    private readonly monitorRepository: MonitorsRepository,
    private readonly checksRepository: ChecksRepository,
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

      createdMonitor = { ...result, lastCheck: null, hasScheduler: false }
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
    let found = null

    try {
      found = await Promise.all([
        this.monitorRepository.find(id),
        this.checksRepository.findLatest(id),
      ])
    } catch {
      throw new InternalServerErrorException()
    }

    const [monitor, lastCheck] = found

    if (!monitor) {
      throw new NotFoundException()
    }

    return {
      ...monitor,
      lastCheck: lastCheck ?? null,
      hasScheduler: !!scheduler,
    }
  }

  async listMonitors({ ownedBy }: ListMonitorsDto): Promise<MonitorListDto> {
    let monitors = null
    try {
      monitors = await this.monitorRepository.findManyWithLastCheck(ownedBy)
    } catch {
      throw new InternalServerErrorException()
    }

    return monitors.map(({ checks, ...monitor }) => ({
      ...monitor,
      lastCheck: checks[0] ?? null,
    }))
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
