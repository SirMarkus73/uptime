import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
} from "@nestjs/common"
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
} from "@nestjs/swagger"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import { ApiAuthenticationErrors } from "../../shared/api-authentication-errors.js"
import { ApiSerializedResponse } from "../../shared/api-serialized-response.js"
import { internalServerErrorSchema } from "../../shared/internal-server-error.js"
import { notFoundSchema } from "../../shared/not-found-error.js"
import {
  type MonitorIdFieldDto,
  monitorIdFieldSchema,
} from "../dto/monitor.dto.js"
import { ChecksService } from "./checks.service.js"
import {
  type CheckDto,
  type CheckListDto,
  checkListSchema,
  checkSchema,
} from "./dto/check.dto.js"
import {
  type FindAllChecksParamsDto,
  type FindAllChecksQueryDto,
  findAllChecksParamsSchema,
  findAllChecksQuerySchema,
  findAllChecksSchema,
} from "./dto/find-all.dto.js"
import {
  type FindChecksSinceDaysQueryDto,
  findChecksSinceDaysQuerySchema,
} from "./dto/find-check.dto.js"

@Controller("monitors/:monitorId/checks")
export class ChecksController {
  constructor(private readonly checksService: ChecksService) {}

  @ApiAuthenticationErrors()
  @ApiBadRequestResponse()
  @ApiInternalServerErrorResponse({
    standardSchema: internalServerErrorSchema,
  })
  @ApiNotFoundResponse({ standardSchema: notFoundSchema })
  @ApiSerializedResponse({ status: HttpStatus.OK, schema: checkListSchema })
  @Get("stats")
  async findSinceDays(
    @Param("monitorId", { schema: monitorIdFieldSchema })
    monitorId: MonitorIdFieldDto,
    @Query({ schema: findChecksSinceDaysQuerySchema })
    { sinceDays }: FindChecksSinceDaysQueryDto,
    @Session() session: UserSession,
  ): Promise<CheckListDto> {
    const { user } = session
    const monitor = await this.checksService.findMonitor(monitorId)

    if (monitor.ownedBy !== user.id) throw new NotFoundException()

    return this.checksService.findSinceDays(monitorId, sinceDays)
  }

  @ApiAuthenticationErrors()
  @ApiBadRequestResponse()
  @ApiInternalServerErrorResponse({
    standardSchema: internalServerErrorSchema,
  })
  @ApiSerializedResponse({ status: HttpStatus.OK, schema: findAllChecksSchema })
  @Get()
  findAll(
    @Query({ schema: findAllChecksQuerySchema }) query: FindAllChecksQueryDto,
    @Param({ schema: findAllChecksParamsSchema })
    params: FindAllChecksParamsDto,
    @Session() session: UserSession,
  ) {
    return this.checksService.findAll(session, params.monitorId, query.cursor)
  }

  @ApiAuthenticationErrors()
  @ApiBadRequestResponse()
  @ApiInternalServerErrorResponse({
    standardSchema: internalServerErrorSchema,
  })
  @ApiNotFoundResponse({ standardSchema: notFoundSchema })
  @ApiSerializedResponse({ status: HttpStatus.CREATED, schema: checkSchema })
  @Post()
  async createCheck(
    @Param("monitorId", { schema: monitorIdFieldSchema })
    monitorId: MonitorIdFieldDto,
    @Session() session: UserSession,
  ): Promise<CheckDto> {
    const { user } = session
    const monitor = await this.checksService.findMonitor(monitorId)

    if (monitor.ownedBy !== user.id) throw new NotFoundException()

    return this.checksService.createCheck(monitorId)
  }
}
