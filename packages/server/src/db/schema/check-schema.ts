import { defineRelationsPart } from "drizzle-orm"
import {
  boolean,
  camelCase,
  index,
  integer,
  numeric,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-orm/zod"
import z from "zod"
import { monitor } from "./monitor-schema.js"

export const check = camelCase.table(
  "check",
  {
    id: uuid().defaultRandom().primaryKey(),
    monitorId: uuid()
      .notNull()
      .references(() => monitor.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    isUp: boolean().notNull(),
    statusCode: integer(),
    responseTimeMs: numeric({ precision: 8, mode: "number" }).notNull(),
    errorCode: varchar(),
    checkedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    index("check_monitor_id_checked_at_idx").on(
      t.monitorId,
      t.checkedAt.desc(),
    ),
  ],
)

// -- Relations
export const checkRelations = defineRelationsPart({ monitor, check }, (r) => ({
  monitor: {
    checks: r.many.check(),
  },
  check: {
    monitor: r.one.monitor({
      from: r.check.monitorId,
      to: r.monitor.id,
    }),
  },
}))

// -- Schemas
export const insertCheckSchema = createInsertSchema(check, {
  checkedAt: () => z.iso.datetime(),
  responseTimeMs: (r) =>
    r.min(0).meta({
      example: 14.2841248,
    }),
})

export const selectCheckSchema = createSelectSchema(check, {
  checkedAt: () => z.iso.datetime(),
  responseTimeMs: (r) =>
    r.min(0).meta({
      example: 14.2841248,
    }),
})

export const updateCheckSchema = createUpdateSchema(check, {
  checkedAt: () => z.iso.datetime(),
  responseTimeMs: (r) =>
    r.min(0).meta({
      example: 14.2841248,
    }),
})
