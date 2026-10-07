import { Module } from "@nestjs/common"
import { UptimeModule } from "../../uptime/uptime.module.js"
import { MonitorsRepository } from "../monitors.repository.js"
import { ChecksController } from "./checks.controller.js"
import { ChecksRepository } from "./checks.repository.js"
import { ChecksService } from "./checks.service.js"

@Module({
  imports: [UptimeModule],
  controllers: [ChecksController],
  providers: [ChecksService, ChecksRepository, MonitorsRepository],
  exports: [ChecksService, ChecksRepository],
})
export class ChecksModule {}
