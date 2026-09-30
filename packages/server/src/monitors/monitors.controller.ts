import { Body, Controller, Get, Param, Post } from "@nestjs/common"
import { ApiCreatedResponse, ApiOkResponse } from "@nestjs/swagger"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import { ApiAuthenticationErrors } from "../shared/api-authentication-errors.js"
import {
  type CreateMonitorBodyDto,
  CreateMonitorResponseDto,
  createMonitorBodySchema,
  createMonitorResponseSchema,
} from "./dto/create-monitor.dto.js"
import {
  GetMonitorResultDto,
  getMonitorResultSchema,
} from "./dto/get-monitor.dto.js"
import {
  type ListMonitorsResponseDto,
  listMonitorsResponseSchema,
} from "./dto/list-monitors.dto.js"
import {
  RunMonitorResultDto,
  runMonitorResultSchema,
} from "./dto/run-monitor.dto.js"
import { MonitorsService } from "./monitors.service.js"

@Controller("monitors")
export class MonitorsController {
  constructor(private readonly monitorService: MonitorsService) {}

  @ApiAuthenticationErrors()
  @ApiCreatedResponse({ standardSchema: createMonitorResponseSchema })
  @Post()
  async createMonitor(
    @Session() session: UserSession,
    @Body({ schema: createMonitorBodySchema }) body: CreateMonitorBodyDto,
  ): Promise<CreateMonitorResponseDto> {
    const { user } = session
    const { webPage, name } = body

    return this.monitorService.createMonitor({
      ownedBy: user.id,
      webPage,
      name,
    })
  }

  @ApiAuthenticationErrors()
  @ApiCreatedResponse({ standardSchema: runMonitorResultSchema })
  @Post(":monitorId/run")
  async runMonitor(
    @Param("monitorId") monitorId: string,
  ): Promise<RunMonitorResultDto> {
    return this.monitorService.runMonitor({ id: monitorId })
  }

  @ApiAuthenticationErrors()
  @ApiOkResponse({ standardSchema: getMonitorResultSchema })
  @Get(":monitorId")
  async getMonitor(
    @Param("monitorId") monitorId: string,
  ): Promise<GetMonitorResultDto> {
    return this.monitorService.getMonitor({ id: monitorId })
  }

  @ApiAuthenticationErrors()
  @ApiOkResponse({ standardSchema: listMonitorsResponseSchema })
  @Get()
  async listMonitors(
    @Session() session: UserSession,
  ): Promise<ListMonitorsResponseDto> {
    const { user } = session

    return this.monitorService.listMonitors({ ownedBy: user.id })
  }
}
