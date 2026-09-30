import { Controller, Get } from "@nestjs/common"
import { ApiOperation } from "@nestjs/swagger"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"

@Controller()
export class AppController {
  @ApiOperation({ operationId: "health" })
  @AllowAnonymous()
  @Get("health")
  health(): { up: true } {
    return { up: true }
  }
}
