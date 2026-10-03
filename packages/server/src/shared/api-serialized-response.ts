import {
  applyDecorators,
  type HttpStatus,
  SerializeOptions,
} from "@nestjs/common"
import { ApiResponse } from "@nestjs/swagger"
import z from "zod"

type ApiSerializedResponseOptions = {
  status: HttpStatus
  schema: z.ZodType
}

// Documenta la respuesta en Swagger y la serializa con el mismo esquema, que
// elimina los campos que no declara. El serializer valida cada elemento de un
// array por separado, así que si el esquema es un array recibe el de sus elementos.
export function ApiSerializedResponse({
  status,
  schema,
}: ApiSerializedResponseOptions) {
  return applyDecorators(
    ApiResponse({ status, standardSchema: schema }),
    SerializeOptions({
      schema: schema instanceof z.ZodArray ? schema.element : schema,
    }),
  )
}
