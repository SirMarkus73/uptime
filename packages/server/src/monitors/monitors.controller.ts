import { Body, Controller, Get, Param, Post } from "@nestjs/common"
import { ApiCreatedResponse, ApiOkResponse } from "@nestjs/swagger"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import { ApiAuthenticationErrors } from "../shared/api-authentication-errors.js"
import {
  type CreateMonitorBodyDto,
  createMonitorBodySchema,
} from "./dto/create-monitor.dto.js"
import {
  MonitorDetailDto,
  MonitorListDto,
  monitorDetailSchema,
  monitorListSchema,
} from "./dto/monitor.dto.js"

import { MonitorsService } from "./monitors.service.js"

@Controller("monitors")
export class MonitorsController {
  constructor(private readonly monitorService: MonitorsService) {}

  @ApiAuthenticationErrors()
  @ApiCreatedResponse({ standardSchema: monitorDetailSchema })
  @Post()
  async createMonitor(
    @Session() session: UserSession,
    @Body({ schema: createMonitorBodySchema }) body: CreateMonitorBodyDto,
  ): Promise<MonitorDetailDto> {
    const { user } = session
    const { webPage, name } = body

    return this.monitorService.createMonitor({
      ownedBy: user.id,
      webPage,
      name,
    })
  }

  @ApiAuthenticationErrors()
  @ApiCreatedResponse({ standardSchema: monitorDetailSchema })
  @Post(":monitorId/run")
  async runMonitor(
    @Param("monitorId") monitorId: string,
  ): Promise<MonitorDetailDto> {
    return this.monitorService.runMonitor({ id: monitorId })
  }

  @ApiAuthenticationErrors()
  @ApiOkResponse({ standardSchema: monitorDetailSchema })
  @Get(":monitorId")
  async getMonitor(
    @Param("monitorId") monitorId: string,
  ): Promise<MonitorDetailDto> {
    return this.monitorService.getMonitor({ id: monitorId })
  }

  @ApiAuthenticationErrors()
  @ApiOkResponse({ standardSchema: monitorListSchema })
  @Get()
  async listMonitors(@Session() session: UserSession): Promise<MonitorListDto> {
    const { user } = session

    return this.monitorService.listMonitors({ ownedBy: user.id })
  }
}
