import z from "zod"
import { selectCheckSchema, selectMonitorSchema } from "../../db/schema.js"

export const getMonitorSchema = selectMonitorSchema.pick({ id: true })
export const getMonitorResultSchema = selectMonitorSchema
  .pick({
    id: true,
    name: true,
    createdAt: true,
    webPage: true,
  })
  .extend({
    checks: z.array(
      selectCheckSchema.pick({
        checkedAt: true,
        errorCode: true,
        id: true,
        isUp: true,
        responseTimeMs: true,
        statusCode: true,
      }),
    ),
  })

export type GetMonitorDto = z.infer<typeof getMonitorSchema>
export type GetMonitorResultDto = z.infer<typeof getMonitorResultSchema>
