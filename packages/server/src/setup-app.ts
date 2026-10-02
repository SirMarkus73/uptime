import {
  type INestApplication,
  StandardSchemaValidationPipe,
} from "@nestjs/common"

export const API_PREFIX = "api"

// Configuración HTTP común a `main.ts` y a los tests e2e, para que estos
// recorran el mismo pipeline (prefijo y validación) que la app real.
export function setupApp(app: INestApplication) {
  app.setGlobalPrefix(API_PREFIX)
  app.useGlobalPipes(new StandardSchemaValidationPipe())
}
