import z from "zod"
import { insertMonitorSchema, selectMonitorSchema } from "../../db/schema.js"

export const createMonitorSchema = insertMonitorSchema.pick({
  name: true,
  ownedBy: true,
  webPage: true,
})

export const createMonitorResponseSchema = selectMonitorSchema.pick({
  id: true,
  name: true,
  webPage: true,
  createdAt: true,
})

export const createMonitorBodySchema = createMonitorSchema.pick({
  webPage: true,
  name: true,
})

export type CreateMonitorDto = z.infer<typeof createMonitorSchema>
export type CreateMonitorResponseDto = z.infer<
  typeof createMonitorResponseSchema
>
export type CreateMonitorBodyDto = z.infer<typeof createMonitorBodySchema>
