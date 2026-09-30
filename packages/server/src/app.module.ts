import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import {
  minutes,
  seconds,
  ThrottlerGuard,
  ThrottlerModule,
} from "@nestjs/throttler"
import { AuthModule } from "@thallesp/nestjs-better-auth"
import { AppController } from "./app.controller.js"
import { AppService } from "./app.service.js"
import { auth } from "./lib/auth.js"
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
    AuthModule.forRoot({ auth }),
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
