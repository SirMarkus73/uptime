import { Controller, Get, Query } from "@nestjs/common"
import { ApiOkResponse, ApiOperation } from "@nestjs/swagger"
import {
  CheckStateDto,
  type CheckStateQueryDto,
  checkStateQuerySchema,
  checkStateSchema,
} from "./dto/check-state.dto.js"
import { UptimeService } from "./uptime.service.js"

@Controller("uptime")
export class UptimeController {
  constructor(private readonly uptimeService: UptimeService) {}

  @ApiOperation({ operationId: "checkUrl" })
  @ApiOkResponse({
    standardSchema: checkStateSchema,
  })
  @Get()
  async checkUrl(
    @Query({ schema: checkStateQuerySchema }) params: CheckStateQueryDto,
  ): Promise<CheckStateDto> {
    return await this.uptimeService.checkState(params.url)
  }
}
