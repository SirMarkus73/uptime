import { existsSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { StandardSchemaValidationPipe } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import type { NestExpressApplication } from "@nestjs/platform-express"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { apiReference } from "@scalar/nestjs-api-reference"
import type { NextFunction, Request, Response } from "express"
import openapiTS, { astToString } from "openapi-typescript"
import { AppModule } from "./app.module.js"
import { CONFIG } from "./config/configuration.js"

const API_PREFIX = "api"

const CLIENT_OPENAPI_PATH = new URL(
  "../../shared/src/api/api-schema.d.ts",
  import.meta.url,
)
const CLIENT_DIST_PATH = fileURLToPath(
  new URL("../../client/dist", import.meta.url),
)

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Required for betterAuth module
    bodyParser: false,
  })

  app.setGlobalPrefix(API_PREFIX)

  const config = new DocumentBuilder()
    .setTitle("Cats example")
    .setDescription("The cats API description")
    .setVersion("1.0")
    .addTag("cats")
    .addGlobalResponse({
      status: 429,
      description: "Too Many Requests",
      schema: {
        type: "object",
        properties: {
          statusCode: { type: "number", enum: [429] },
          message: {
            type: "string",
            example: "ThrottlerException: Too Many Requests",
          },
        },
      },
    })
    .addGlobalResponse({
      status: 400,
      description: "Validation error",
      schema: {
        type: "object",
        properties: {
          statusCode: { type: "number", enum: [400] },
          message: {
            type: "array",
            items: { type: "string" },
            example: ["url must be a valid URL", "name should not be empty"],
          },
          error: { type: "string", example: "Bad Request" },
        },
      },
    })
    .build()

  const document = SwaggerModule.createDocument(app, config)

  if (CONFIG.NODE_ENV !== "production") {
    const ast = await openapiTS(JSON.stringify(document))
    const contents = astToString(ast)

    writeFileSync(CLIENT_OPENAPI_PATH, contents)
  }

  SwaggerModule.setup(API_PREFIX, app, () => document, {
    ui: false,
    raw: ["json"],
    jsonDocumentUrl: `${API_PREFIX}/openapi.json`,
  })

  app.use(
    `/${API_PREFIX}/reference`,
    apiReference({ url: `/${API_PREFIX}/openapi.json` }),
  )

  // Sirve el frontend compilado desde el mismo servidor. Cualquier ruta que no
  // sea de la API devuelve index.html para que el router del cliente la maneje.
  if (existsSync(CLIENT_DIST_PATH)) {
    app.useStaticAssets(CLIENT_DIST_PATH)
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET" || req.path.startsWith(`/${API_PREFIX}`)) {
        return next()
      }
      res.sendFile("index.html", { root: CLIENT_DIST_PATH })
    })
  }

  app.useGlobalPipes(new StandardSchemaValidationPipe())

  await app.listen(CONFIG.PORT ?? 3000)
}
await bootstrap()
