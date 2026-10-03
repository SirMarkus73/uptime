import {
  type INestApplication,
  StandardSchemaSerializerInterceptor,
  StandardSchemaValidationPipe,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"

export const API_PREFIX = "api"

// Configuración HTTP común a `main.ts` y a los tests e2e, para que estos
// recorran el mismo pipeline (prefijo, validación y serialización) que la app real.
export function setupApp(app: INestApplication) {
  app.setGlobalPrefix(API_PREFIX)
  app.useGlobalPipes(new StandardSchemaValidationPipe())
  // Cada endpoint elige su esquema de respuesta con `@ApiSerializedResponse()`,
  // que elimina los campos que no declara. Sin esquema, la respuesta sale tal cual.
  app.useGlobalInterceptors(
    new StandardSchemaSerializerInterceptor(app.get(Reflector)),
  )
}
