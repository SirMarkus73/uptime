import z from "zod"
import { insertMonitorSchema } from "../../db/schema.js"

export const createMonitorSchema = insertMonitorSchema.pick({
  name: true,
  ownedBy: true,
  webPage: true,
  executeEveryMinutes: true,
})

export const createMonitorBodySchema = createMonitorSchema.omit({
  ownedBy: true,
})

export type CreateMonitorDto = z.infer<typeof createMonitorSchema>
export type CreateMonitorBodyDto = z.infer<typeof createMonitorBodySchema>
