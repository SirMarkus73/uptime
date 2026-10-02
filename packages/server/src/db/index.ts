import { refineCodecs } from "drizzle-orm/codecs"
import { drizzle } from "drizzle-orm/node-postgres"
import { nodePgCodecs } from "drizzle-orm/node-postgres/codecs"
import { CONFIG } from "../config/configuration.js"
import relations from "./relations.js"

// Postgres devuelve los timestamptz como "2026-10-02 21:58:12.434+00", que no es
// el ISO 8601 que documenta la API (z.iso.datetime()) y que no todos los
// navegadores saben leer. Las columnas `timestamp({ mode: "string", withTimezone: true })`
// se normalizan a "2026-10-02T21:58:12.434Z", también dentro de las relaciones.
const toIsoString = (value: string) => new Date(value).toISOString()

const codecs = refineCodecs(nodePgCodecs, {
  "timestamptz:string": {
    ...nodePgCodecs["timestamptz:string"],
    normalize: toIsoString,
    normalizeInJson: toIsoString,
  },
})

export const db = drizzle(CONFIG.DATABASE_URL, {
  relations,
  codecs,
})
