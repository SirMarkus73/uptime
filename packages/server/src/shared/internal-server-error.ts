import z from "zod"

export const internalServerErrorSchema = z.object({
  message: z.string(),
  statusCode: z.literal(500),
})
