import { defineRelationsPart } from "drizzle-orm"
import { camelCase, text, uuid } from "drizzle-orm/pg-core"
import { user } from "./auth-schema.js"

export const monitor = camelCase.table("monitor", {
  id: uuid().defaultRandom().primaryKey(),
  webPage: text().notNull(),
  ownedBy: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
})

export const monitorRelations = defineRelationsPart({ user, monitor }, (r) => ({
  monitor: {
    owner: r.one.user({
      from: r.monitor.ownedBy,
      to: r.user.id,
    }),
  },
}))
