import { ApiResponse } from "@nestjs/swagger"
import z from "zod"

const unauthorizedSchema = z.object({
  message: z.string().meta({
    example: "Unauthorized",
  }),
  statusCode: z.literal(401),
})

export function ApiAuthenticationErrors() {
  return ApiResponse({ standardSchema: unauthorizedSchema, status: 401 })
}
