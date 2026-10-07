import { BullModule } from "@nestjs/bullmq"
import { Module } from "@nestjs/common"
import { ChecksModule } from "./checks/checks.module.js"
import { MonitorsConsumer } from "./monitors.consumer.js"
import { MonitorsController } from "./monitors.controller.js"
import { MONITORS_QUEUE } from "./monitors.queue.js"
import { MonitorsRepository } from "./monitors.repository.js"
import { MonitorsService } from "./monitors.service.js"

@Module({
  imports: [BullModule.registerQueue({ name: MONITORS_QUEUE }), ChecksModule],
  controllers: [MonitorsController],
  providers: [MonitorsService, MonitorsConsumer, MonitorsRepository],
})
export class MonitorsModule {}
