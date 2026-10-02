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
import { MonitorsModule } from "./monitors/monitors.module.js"
import { UptimeModule } from "./uptime/uptime.module.js"

@Module({
  imports: [
    ThrottlerModule.forRoot({
      // Cada throttler necesita su propio nombre: sin él ambos se llaman
      // "default", comparten contador y cada petición cuenta dos veces.
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
    // Cliente y API comparten origen, así que no hace falta CORS. Además el
    // módulo no admite `trustedOrigins` como función si tiene que montarlo.
    AuthModule.forRoot({ auth, disableTrustedOriginsCors: true }),
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
