import z from "zod"
import { selectCheckSchema, selectMonitorSchema } from "../../db/schema.js"

export const monitorDetailSchema = selectMonitorSchema
  .pick({
    id: true,
    name: true,
    createdAt: true,
    webPage: true,
    ownedBy: true,
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

export const monitorListSchema = z.array(
  selectMonitorSchema
    .pick({
      id: true,
      name: true,
      createdAt: true,
      webPage: true,
      ownedBy: true,
    })
    .extend({ isUp: z.boolean().nullable() }),
)

export const monitorIdFieldSchema = selectMonitorSchema.shape.id.meta({
  title: "The id of the monitor",
})

export type MonitorDetailDto = z.infer<typeof monitorDetailSchema>
export type MonitorListDto = z.infer<typeof monitorListSchema>
