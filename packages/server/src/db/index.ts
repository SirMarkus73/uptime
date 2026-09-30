import { drizzle } from "drizzle-orm/node-postgres"
import { CONFIG } from "../config/configuration.js"
import relations from "./relations.js"

export const db = drizzle(CONFIG.DATABASE_URL, {
  relations,
})
