import { BullModule } from "@nestjs/bullmq"
import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import {
  minutes,
  seconds,
  ThrottlerGuard,
  ThrottlerModule,
} from "@nestjs/throttler"
import { AuthModule } from "@thallesp/nestjs-better-auth"
import { createPostgresBackend, setDefaultBackendFactory } from "bullmq"
import { AppController } from "./app.controller.js"
import { AppService } from "./app.service.js"
import { CONFIG } from "./config/configuration.js"
import { auth } from "./lib/auth.js"
import { MonitorsModule } from "./monitors/monitors.module.js"
import { UptimeModule } from "./uptime/uptime.module.js"

// Poner postgres como backend de BullMQ
setDefaultBackendFactory(createPostgresBackend)

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: "short",
          ttl: seconds(1),
          limit: 3,
        },
        {
          name: "long",
          ttl: minutes(1),
          limit: 8,
        },
      ],
    }),
    AuthModule.forRoot({ auth, disableTrustedOriginsCors: true }),
    BullModule.forRoot({
      connection: { connectionString: CONFIG.DATABASE_URL, migrate: true },
    }),
    UptimeModule,
    MonitorsModule,
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
