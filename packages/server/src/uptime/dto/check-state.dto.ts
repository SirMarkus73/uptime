import { z } from "zod"
import { selectCheckSchema } from "../../db/schema/check-schema.js"

export const checkStateResultSchema = selectCheckSchema.pick({
  checkedAt: true,
  errorCode: true,
  isUp: true,
  responseTimeMs: true,
  statusCode: true,
})

export const checkStateQuerySchema = z.object({
  url: z.httpUrl().meta({
    title: "Url",
    description: "Url to check if it's up",
  }),
})

export type CheckStateResultDto = z.infer<typeof checkStateResultSchema>
export type CheckStateQueryDto = z.infer<typeof checkStateQuerySchema>
