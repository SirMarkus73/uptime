import { defineConfig } from "drizzle-kit"
import { CONFIG } from "./src/config/configuration.js"

export default defineConfig({
  out: "./src/db/migrations/",
  schema: "./src/db/schema/",
  dialect: "postgresql",
  dbCredentials: {
    url: CONFIG.DATABASE_URL,
  },
})
