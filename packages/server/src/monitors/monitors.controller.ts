import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common"
import { ApiNoContentResponse, ApiNotFoundResponse } from "@nestjs/swagger"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import { ApiAuthenticationErrors } from "../shared/api-authentication-errors.js"
import { ApiSerializedResponse } from "../shared/api-serialized-response.js"
import { notFoundSchema } from "../shared/not-found-error.js"
import {
  type CreateMonitorBodyDto,
  createMonitorBodySchema,
} from "./dto/create-monitor.dto.js"
import {
  MonitorDetailDto,
  MonitorListDto,
  monitorDetailSchema,
  monitorIdFieldSchema,
  monitorListSchema,
} from "./dto/monitor.dto.js"
import { MonitorsService } from "./monitors.service.js"

@Controller("monitors")
export class MonitorsController {
  constructor(private readonly monitorService: MonitorsService) {}

  @ApiAuthenticationErrors()
  @ApiSerializedResponse({
    status: HttpStatus.CREATED,
    schema: monitorDetailSchema,
  })
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
  @ApiNotFoundResponse({ standardSchema: notFoundSchema })
  @ApiSerializedResponse({
    status: HttpStatus.CREATED,
    schema: monitorDetailSchema,
  })
  @Post(":monitorId/run")
  async runMonitor(
    @Param("monitorId", { schema: monitorIdFieldSchema }) monitorId: string,
    @Session() session: UserSession,
  ): Promise<MonitorDetailDto> {
    const { user } = session
    const monitor = await this.monitorService.getMonitor({ id: monitorId })

    if (monitor.ownedBy !== user.id) throw new NotFoundException()

    return this.monitorService.runMonitor({ id: monitorId })
  }

  @ApiAuthenticationErrors()
  @ApiNotFoundResponse({ standardSchema: notFoundSchema })
  @ApiSerializedResponse({ status: HttpStatus.OK, schema: monitorDetailSchema })
  @Get(":monitorId")
  async getMonitor(
    @Param("monitorId", { schema: monitorIdFieldSchema }) monitorId: string,
    @Session() session: UserSession,
  ): Promise<MonitorDetailDto> {
    const { user } = session
    const monitor = await this.monitorService.getMonitor({ id: monitorId })

    if (monitor.ownedBy !== user.id) throw new NotFoundException()
    return monitor
  }

  @ApiAuthenticationErrors()
  @ApiSerializedResponse({
    status: HttpStatus.OK,
    schema: monitorListSchema,
  })
  @Get()
  async listMonitors(@Session() session: UserSession): Promise<MonitorListDto> {
    const { user } = session

    return this.monitorService.listMonitors({ ownedBy: user.id })
  }

  @ApiAuthenticationErrors()
  @ApiNotFoundResponse({ standardSchema: notFoundSchema })
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(":monitorId")
  async deleteMonitor(
    @Param("monitorId", { schema: monitorIdFieldSchema }) monitorId: string,
    @Session() session: UserSession,
  ) {
    const { user } = session
    const monitor = await this.monitorService.getMonitor({ id: monitorId })

    if (monitor.ownedBy !== user.id) throw new NotFoundException()

    await this.monitorService.deleteMonitor({ id: monitorId })
  }
}
