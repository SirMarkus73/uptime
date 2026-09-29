import { z } from "zod"

export const checkStateSchema = z.object({
  isUp: z.boolean(),
  statusCode: z.number().nullable().meta({
    description: "May be null when a fetch error has occurred",
    example: 200,
  }),
  responseTimeMs: z.number().meta({
    example: 214.22672000000057,
  }),
  fetchError: z.string().nullable().meta({
    example: null,
  }),
  checkedAt: z.iso.datetime(),
})

export const checkStateQuerySchema = z.object({
  url: z.httpUrl().meta({
    title: "Url",
    description: "Url to check if it's up",
  }),
})

export type CheckStateDto = z.infer<typeof checkStateSchema>
export type CheckStateQueryDto = z.infer<typeof checkStateQuerySchema>
