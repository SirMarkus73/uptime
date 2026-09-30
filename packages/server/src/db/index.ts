import { drizzle } from "drizzle-orm/node-postgres"
import { CONFIG } from "../config/configuration.js"

export const db = drizzle(CONFIG.DATABASE_URL)
