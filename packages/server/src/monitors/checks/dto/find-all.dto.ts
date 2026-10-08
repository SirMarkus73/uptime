import { BadRequestException } from "@nestjs/common"
import z from "zod"
import { selectCheckSchema } from "../../../db/schema.js"
import { cursorPaginatedDto } from "../../../shared/dto/cursor-paginated.dto.js"
import { monitorIdFieldSchema } from "../../dto/monitor.dto.js"

// -- Constants

export const FIND_ALL_PAGE_SIZE = 20 as const

// -- Schemas

const checksCursorSchema = z.object({
  checkedAt: z.iso.datetime(),
  id: z.uuid(),
})

export const findAllChecksQuerySchema = z.object({
  cursor: z
    .base64url()
    .optional()
    .transform((cursor) => (cursor ? decodeChecksCursor(cursor) : undefined)),
})

export const findAllChecksParamsSchema = z.object({
  monitorId: monitorIdFieldSchema,
})

export const findAllChecksSchema = cursorPaginatedDto(
  selectCheckSchema
    .pick({
      id: true,
      checkedAt: true,
      errorCode: true,
      isUp: true,
      monitorId: true,
      responseTimeMs: true,
      statusCode: true,
    })
    .array(),
)

// -- Types

export type FindAllChecksDto = z.infer<typeof findAllChecksSchema>
export type FindAllChecksParamsDto = z.infer<typeof findAllChecksParamsSchema>
export type FindAllChecksQueryDto = z.infer<typeof findAllChecksQuerySchema>
export type ChecksCursorDto = z.infer<typeof checksCursorSchema>

// -- Helper fn

export function encodeChecksCursor(cursor: ChecksCursorDto): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url")
}

export function decodeChecksCursor(cursor: string): ChecksCursorDto {
  try {
    return checksCursorSchema.parse(
      JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8")),
    )
  } catch {
    throw new BadRequestException("Invalid cursor")
  }
}
