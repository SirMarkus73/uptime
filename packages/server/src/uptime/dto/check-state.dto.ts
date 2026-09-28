import z from "zod"

export const checkStateSchema = z.object({
  isUp: z.boolean(),
  statusCode: z.number().nullable().meta({
    description: "May be null when a fetch error has occurred",
  }),
  responseTimeMs: z.number(),
  fetchError: z.string().nullable(),
  checkedAt: z.iso.datetime(),
})

export const checkStateInputSchema = z.object({
  url: z.httpUrl(),
})

export type checkStateDto = z.infer<typeof checkStateSchema>
export type checkStateInputSchema = z.infer<typeof checkStateInputSchema>
