import { Module } from "@nestjs/common"
import { UptimeModule } from "../uptime/uptime.module.js"
import { MonitorsController } from "./monitors.controller.js"
import { MonitorsService } from "./monitors.service.js"

@Module({
  imports: [UptimeModule],
  controllers: [MonitorsController],
  providers: [MonitorsService],
})
export class MonitorsModule {}
