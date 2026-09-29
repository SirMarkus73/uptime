import { Controller, Get } from "@nestjs/common"
import { ApiOperation } from "@nestjs/swagger"

@Controller()
export class AppController {
  @ApiOperation({ operationId: "health" })
  @Get("health")
  health(): { up: true } {
    return { up: true }
  }
}
