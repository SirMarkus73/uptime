import z from "zod"
import { selectCheckSchema } from "../../../db/schema.js"

export const checkSchema = selectCheckSchema.pick({
  checkedAt: true,
  errorCode: true,
  id: true,
  isUp: true,
  responseTimeMs: true,
  statusCode: true,
})

export const checkListSchema = z.array(checkSchema)

export type CheckDto = z.infer<typeof checkSchema>
export type CheckListDto = z.infer<typeof checkListSchema>
