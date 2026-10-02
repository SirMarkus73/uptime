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
  secret: CONFIG.BETTER_AUTH_SECRET,
  // El cliente siempre se sirve desde el mismo origen que la API (el propio
  // servidor o el proxy de Vite), pero ese origen depende de cómo se acceda:
  // desde otro dispositivo de la red es la IP del equipo, no BETTER_AUTH_URL.
  // Confiar en el origen al que va dirigida la petición mantiene la protección
  // CSRF, porque una web ajena siempre envía un Origin distinto.
  trustedOrigins: (request) => (request ? [new URL(request.url).origin] : []),
  advanced: {
    // Better Auth desactiva la comprobación del origen con NODE_ENV=test; se
    // fuerza para que los tests e2e la recorran igual que en producción.
    disableOriginCheck: false,
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  //... the rest of your config
})
