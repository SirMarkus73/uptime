import { Controller, Get, Param } from "@nestjs/common"
import { ApiOkResponse } from "@nestjs/swagger"
import {
  checkStateDto,
  checkStateInputSchema,
  checkStateSchema,
} from "./dto/check-state.dto.js"
import { UptimeService } from "./uptime.service.js"

@Controller("uptime")
export class UptimeController {
  constructor(private readonly uptimeService: UptimeService) {}

  @ApiOkResponse({
    standardSchema: checkStateSchema,
  })
  @Get(":url")
  async checkUrl(
    @Param({ schema: checkStateInputSchema }) params: checkStateInputSchema,
  ): Promise<checkStateDto> {
    return await this.uptimeService.checkState(params.url)
  }
}
