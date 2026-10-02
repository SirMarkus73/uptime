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
export const insertMonitorSchema = createInsertSchema(monitor, {
  createdAt: () => z.iso.datetime(),
  webPage: () => z.httpUrl(),
  name: (r) => r.min(1).max(30),
})
export const selectMonitorSchema = createSelectSchema(monitor, {
  createdAt: () => z.iso.datetime(),
  webPage: () => z.httpUrl(),
  name: (r) => r.min(1).max(30),
})
export const updateMonitorSchema = createUpdateSchema(monitor, {
  createdAt: () => z.iso.datetime(),
  webPage: () => z.httpUrl(),
  name: (r) => r.min(1).max(30),
})
