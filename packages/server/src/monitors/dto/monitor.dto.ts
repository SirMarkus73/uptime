import z from "zod"
import { selectMonitorSchema } from "../../db/schema.js"
import { checkSchema } from "../checks/dto/check.dto.js"

export const monitorDetailSchema = selectMonitorSchema
  .pick({
    id: true,
    name: true,
    createdAt: true,
    webPage: true,
    ownedBy: true,
    executeEveryMinutes: true,
  })
  .extend({
    lastCheck: checkSchema.nullable(),
    hasScheduler: z.boolean(),
  })

export const monitorListSchema = z.array(
  selectMonitorSchema
    .pick({
      id: true,
      name: true,
      createdAt: true,
      webPage: true,
      ownedBy: true,
    })
    .extend({ lastCheck: checkSchema.nullable() }),
)

export const monitorIdFieldSchema = selectMonitorSchema.shape.id.meta({
  title: "The id of the monitor",
})

export type MonitorDetailDto = z.infer<typeof monitorDetailSchema>
export type MonitorListDto = z.infer<typeof monitorListSchema>
export type MonitorIdFieldDto = z.infer<typeof monitorIdFieldSchema>
