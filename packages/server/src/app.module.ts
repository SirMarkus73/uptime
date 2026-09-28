import { Module } from "@nestjs/common"
import { AppController } from "./app.controller.js"
import { AppService } from "./app.service.js"
import { UptimeModule } from "./uptime/uptime.module.js"

@Module({
  imports: [UptimeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
