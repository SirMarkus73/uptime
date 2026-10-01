import z from "zod"
import { selectMonitorSchema } from "../../db/schema.js"

export const listMonitorsSchema = selectMonitorSchema.pick({ ownedBy: true })

export type ListMonitorsDto = z.infer<typeof listMonitorsSchema>
