import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2"
import { betterAuth } from "better-auth"
import { CONFIG } from "../config/configuration.js"
import { db } from "../db/index.js"
import * as schema from "../db/schema/auth-schema.js"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "pg" or "mysql"
    schema,
  }),
  baseURL: CONFIG.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  //... the rest of your config
})
