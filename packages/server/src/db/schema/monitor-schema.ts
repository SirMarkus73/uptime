import { defineRelationsPart } from "drizzle-orm"
import {
  camelCase,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-orm/zod"
import z from "zod"
import { user } from "./auth-schema.js"

export const monitor = camelCase.table(
  "monitor",
  {
    id: uuid().defaultRandom().primaryKey(),
    name: text().notNull(),
    webPage: text().notNull(),
    ownedBy: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
    createdAt: timestamp({ mode: "string", withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("unique_name_and_owner").on(t.ownedBy, t.name)],
)

// -- Relations
export const monitorRelations = defineRelationsPart({ user, monitor }, (r) => ({
  monitor: {
    owner: r.one.user({
      from: r.monitor.ownedBy,
      to: r.user.id,
    }),
  },
}))

// -- Schemas
// Normaliza la URL con el parser WHATWG: pone en minúsculas el esquema y el dominio,
// pero respeta la ruta y los parámetros, que sí distinguen mayúsculas. Si no se puede
// parsear se deja tal cual para que z.httpUrl() la rechace con un 400 en lugar de lanzar.
const webPageSchema = () =>
  z.httpUrl().overwrite((url) => URL.parse(url)?.href ?? url)

export const insertMonitorSchema = createInsertSchema(monitor, {
  createdAt: () => z.iso.datetime(),
  webPage: webPageSchema,
  name: (r) => r.min(1).max(30),
})
export const selectMonitorSchema = createSelectSchema(monitor, {
  createdAt: () => z.iso.datetime(),
  webPage: () => z.httpUrl(),
  name: (r) => r.min(1).max(30),
})
export const updateMonitorSchema = createUpdateSchema(monitor, {
  createdAt: () => z.iso.datetime(),
  webPage: webPageSchema,
  name: (r) => r.min(1).max(30),
})
