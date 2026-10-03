import z from "zod"
import { selectMonitorSchema } from "../../db/schema.js"

export const activateMonitorSchedulerDto = selectMonitorSchema.pick({
  id: true,
  executeEveryMinutes: true,
})

export type ActivateMonitorSchedulerDto = z.infer<
  typeof activateMonitorSchedulerDto
>
