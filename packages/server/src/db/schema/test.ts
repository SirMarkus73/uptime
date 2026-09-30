import { snakeCase } from "drizzle-orm/pg-core"
import { integer, varchar } from "drizzle-orm/pg-core/columns"

export const exampleTable = snakeCase.table("example", {
  id: integer().generatedAlwaysAsIdentity(),
  otraCosa: varchar(),
})
