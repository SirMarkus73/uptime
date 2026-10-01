import z from "zod"
import { selectMonitorSchema } from "../../db/schema.js"

export const deleteMonitorSchema = selectMonitorSchema.pick({ id: true })
export type DeleteMonitorDto = z.infer<typeof deleteMonitorSchema>
