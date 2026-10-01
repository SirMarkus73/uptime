import z from "zod"
import { selectMonitorSchema } from "../../db/schema.js"

export const getMonitorSchema = selectMonitorSchema.pick({ id: true })
export type GetMonitorDto = z.infer<typeof getMonitorSchema>
