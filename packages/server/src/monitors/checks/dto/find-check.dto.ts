import z from "zod"

export const findChecksSinceDaysQuerySchema = z.object({
  sinceDays: z.coerce.number().min(1).max(90).optional().default(5),
})

export type FindChecksSinceDaysQueryDto = z.infer<
  typeof findChecksSinceDaysQuerySchema
>
