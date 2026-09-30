import { Module } from "@nestjs/common"
import { HttpClientModule } from "@nestjs/http-client"
import { UptimeController } from "./uptime.controller.js"
import { UptimeService } from "./uptime.service.js"

@Module({
  imports: [HttpClientModule.register()],
  controllers: [UptimeController],
  providers: [UptimeService],
  exports: [UptimeService],
})
export class UptimeModule {}
