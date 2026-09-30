import z from "zod"
import { selectMonitorSchema } from "../../db/schema.js"

export const listMonitorsSchema = selectMonitorSchema.pick({ ownedBy: true })

export const listMonitorsResponseSchema = z.array(
  selectMonitorSchema
    .pick({
      id: true,
      name: true,
      webPage: true,
      createdAt: true,
    })
    .extend({
      isUp: z
        .boolean()
        .nullable()
        .meta({ description: "May be null when no checks has run" }),
    }),
)

export type ListMonitorsResponseDto = z.infer<typeof listMonitorsResponseSchema>
export type ListMonitorsDto = z.infer<typeof listMonitorsSchema>
