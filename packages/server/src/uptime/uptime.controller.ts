import { Controller, Get, Query } from "@nestjs/common"
import { ApiOkResponse, ApiOperation } from "@nestjs/swagger"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
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
  @ApiOkResponse({
    standardSchema: checkStateResultSchema,
  })
  @AllowAnonymous()
  @Get()
  async checkUrl(
    @Query({ schema: checkStateQuerySchema }) params: CheckStateQueryDto,
  ): Promise<CheckStateResultDto> {
    return await this.uptimeService.checkState(params.url)
  }
}
