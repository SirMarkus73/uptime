import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common"
import { UptimeService } from "../../uptime/uptime.service.js"
import { MonitorDetailDto } from "../dto/monitor.dto.js"
import { MonitorsRepository } from "../monitors.repository.js"
import { ChecksRepository } from "./checks.repository.js"
import { CheckDto, CheckListDto } from "./dto/check.dto.js"

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

  async findSinceDays(
    id: MonitorDetailDto["id"],
    days: number,
  ): Promise<CheckListDto> {
    try {
      return await this.checksRepository.findAllSinceDays(id, days)
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
