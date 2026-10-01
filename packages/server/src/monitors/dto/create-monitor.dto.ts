import z from "zod"
import { insertMonitorSchema } from "../../db/schema.js"

export const createMonitorSchema = insertMonitorSchema.pick({
  name: true,
  ownedBy: true,
  webPage: true,
})

export const createMonitorBodySchema = createMonitorSchema.pick({
  webPage: true,
  name: true,
})

export type CreateMonitorDto = z.infer<typeof createMonitorSchema>
export type CreateMonitorBodyDto = z.infer<typeof createMonitorBodySchema>
