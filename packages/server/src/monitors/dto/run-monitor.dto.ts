import z from "zod"
import { selectCheckSchema, selectMonitorSchema } from "../../db/schema.js"

export const runMonitorSchema = selectMonitorSchema.pick({ id: true })
export const runMonitorResultSchema = selectCheckSchema.pick({
  id: true,
  errorCode: true,
  checkedAt: true,
  isUp: true,
  responseTimeMs: true,
  statusCode: true,
})

export type RunMonitorDto = z.infer<typeof runMonitorSchema>
export type RunMonitorResultDto = z.infer<typeof runMonitorResultSchema>
