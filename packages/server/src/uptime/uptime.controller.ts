import { Controller, Get, HttpStatus, Query } from "@nestjs/common"
import { ApiOperation } from "@nestjs/swagger"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ApiSerializedResponse } from "../shared/api-serialized-response.js"
import {
  type CheckStateQueryDto,
  CheckStateResultDto,
  checkStateQuerySchema,
  checkStateResultSchema,
} from "./dto/check-state.dto.js"
import { UptimeService } from "./uptime.service.js"

@Controller("uptime")
export class UptimeController {
  constructor(private readonly uptimeService: UptimeService) {}

  @ApiOperation({ operationId: "checkUrl" })
  @ApiSerializedResponse({
    status: HttpStatus.OK,
    schema: checkStateResultSchema,
  })
  @AllowAnonymous()
  @Get()
  async checkUrl(
    @Query({ schema: checkStateQuerySchema }) params: CheckStateQueryDto,
  ): Promise<CheckStateResultDto> {
    return await this.uptimeService.checkState(params.url)
  }
}
