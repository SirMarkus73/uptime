import z from "zod"
import { selectMonitorSchema } from "../../db/schema.js"

export const runMonitorSchema = selectMonitorSchema.pick({ id: true })

export type RunMonitorDto = z.infer<typeof runMonitorSchema>
