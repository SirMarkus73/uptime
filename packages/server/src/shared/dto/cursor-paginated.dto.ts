import z from "zod"

export function cursorPaginatedDto<T extends z.ZodArray>(schema: T) {
  return z.object({
    data: schema,
    meta: z.object({
      size: z.number().nonnegative(),
      nextCursor: z.base64url().nullable(),
    }),
  })
}
