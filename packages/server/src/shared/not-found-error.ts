import z from "zod"

export const notFoundSchema = z.object({
  message: z.string(),
  statusCode: z.literal(404),
})
