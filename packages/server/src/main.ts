import { StandardSchemaValidationPipe } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { AppModule } from "./app.module.js"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

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
          statusCode: { type: "number", example: 429 },
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

  const documentFactory = () => SwaggerModule.createDocument(app, config)

  SwaggerModule.setup("api", app, documentFactory)
  app.useGlobalPipes(new StandardSchemaValidationPipe())

  await app.listen(process.env.PORT ?? 3000)
}
await bootstrap()
