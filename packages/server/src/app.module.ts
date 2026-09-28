import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import {
  minutes,
  seconds,
  ThrottlerGuard,
  ThrottlerModule,
} from "@nestjs/throttler"
import { AppController } from "./app.controller.js"
import { AppService } from "./app.service.js"
import { UptimeModule } from "./uptime/uptime.module.js"

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: seconds(1),
          limit: 3,
        },
        {
          ttl: minutes(1),
          limit: 8,
        },
      ],
    }),
    UptimeModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AppService,
  ],
})
export class AppModule {}
