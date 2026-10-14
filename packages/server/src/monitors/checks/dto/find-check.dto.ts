import z from "zod"

export const findChecksSinceDaysQuerySchema = z.object({
  detail: z.enum(["today", "month", "week", "year"]).default("today"),
})

// Tamaño de los intervalos en los que se agrupan los checks de cada periodo,
// para que la respuesta no crezca con el número de checks (como mucho 96, 168,
// 124 y 366 intervalos).
export const STATS_BUCKETS = {
  today: "15 minutes",
  week: "1 hour",
  month: "6 hours",
  year: "1 day",
} as const satisfies Record<FindChecksSinceDaysQueryDto["detail"], string>

// Resumen de los checks de un intervalo. Conserva los nombres de `checkSchema`
// para que se pueda pintar igual que un check suelto.
export const checkStatSchema = z.object({
  checkedAt: z.iso.datetime().meta({ description: "Inicio del intervalo" }),
  isUp: z.boolean().meta({
    description: "Si todos los checks del intervalo estuvieron operativos",
  }),
  responseTimeMs: z
    .number()
    .min(0)
    .meta({ description: "Tiempo de respuesta medio", example: 14.2841248 }),
  minResponseTimeMs: z.number().min(0),
  maxResponseTimeMs: z.number().min(0),
  checks: z.int().min(1).meta({ description: "Checks del intervalo" }),
  upChecks: z
    .int()
    .min(0)
    .meta({ description: "Checks operativos del intervalo" }),
})

export const checkStatListSchema = z.array(checkStatSchema)

export type FindChecksSinceDaysQueryDto = z.infer<
  typeof findChecksSinceDaysQuerySchema
>
export type StatsBucket = (typeof STATS_BUCKETS)[keyof typeof STATS_BUCKETS]
export type CheckStatDto = z.infer<typeof checkStatSchema>
export type CheckStatListDto = z.infer<typeof checkStatListSchema>
