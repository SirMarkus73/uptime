import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common"
import type { UserSession } from "@thallesp/nestjs-better-auth"
import { db } from "../../db/index.js"
import { UptimeService } from "../../uptime/uptime.service.js"
import { MonitorDetailDto, MonitorIdFieldDto } from "../dto/monitor.dto.js"
import { MonitorsRepository } from "../monitors.repository.js"
import { ChecksRepository } from "./checks.repository.js"
import { CheckDto, CheckListDto } from "./dto/check.dto.js"
import {
  type ChecksCursorDto,
  encodeChecksCursor,
  FIND_ALL_PAGE_SIZE,
  type FindAllChecksDto,
} from "./dto/find-all.dto.js"

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

    let checks: Awaited<ReturnType<typeof db.query.check.findMany>>

    try {
      checks = await db.query.check.findMany({
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
        limit: FIND_ALL_PAGE_SIZE + 1,
      })
    } catch {
      throw new InternalServerErrorException()
    }

    const next = checks.at(FIND_ALL_PAGE_SIZE)
    const nextCursor = next
      ? encodeChecksCursor({
          checkedAt: new Date(next.checkedAt).toISOString(),
          id: next.id,
        })
      : null

    const data = checks.slice(0, FIND_ALL_PAGE_SIZE)

    return {
      data,
      meta: {
        nextCursor,
        size: data.length,
      },
    }
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
