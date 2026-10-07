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
import {
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
} from "@nestjs/swagger"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import { ApiAuthenticationErrors } from "../shared/api-authentication-errors.js"
import { ApiSerializedResponse } from "../shared/api-serialized-response.js"
import { internalServerErrorSchema } from "../shared/internal-server-error.js"
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
  @ApiInternalServerErrorResponse({
    standardSchema: internalServerErrorSchema,
  })
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

    return this.monitorService.createMonitor({
      ...body,
      ownedBy: user.id,
    })
  }

  @ApiAuthenticationErrors()
  @ApiInternalServerErrorResponse({
    standardSchema: internalServerErrorSchema,
  })
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
  @ApiInternalServerErrorResponse({
    standardSchema: internalServerErrorSchema,
  })
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
  @ApiInternalServerErrorResponse({
    standardSchema: internalServerErrorSchema,
  })
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

  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAuthenticationErrors()
  @ApiInternalServerErrorResponse({
    standardSchema: internalServerErrorSchema,
  })
  @ApiNotFoundResponse({ standardSchema: notFoundSchema })
  @ApiNoContentResponse()
  @Post(":monitorId/scheduler")
  async activateMonitorScheduler(
    @Param("monitorId", { schema: monitorIdFieldSchema }) monitorId: string,
    @Session() session: UserSession,
  ) {
    const { user } = session
    const monitor = await this.monitorService.getMonitor({ id: monitorId })

    if (monitor.ownedBy !== user.id) throw new NotFoundException()

    await this.monitorService.activateMonitorScheduler({
      id: monitorId,
      executeEveryMinutes: monitor.executeEveryMinutes,
    })
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAuthenticationErrors()
  @ApiInternalServerErrorResponse({
    standardSchema: internalServerErrorSchema,
  })
  @ApiNotFoundResponse({ standardSchema: notFoundSchema })
  @ApiNoContentResponse()
  @Delete(":monitorId/scheduler")
  async deactivateMonitorScheduler(
    @Param("monitorId", { schema: monitorIdFieldSchema }) monitorId: string,
    @Session() session: UserSession,
  ) {
    const { user } = session
    const monitor = await this.monitorService.getMonitor({ id: monitorId })

    if (monitor.ownedBy !== user.id) throw new NotFoundException()

    await this.monitorService.deactivateMonitorScheduler({
      id: monitorId,
      executeEveryMinutes: monitor.executeEveryMinutes,
    })
  }
}
