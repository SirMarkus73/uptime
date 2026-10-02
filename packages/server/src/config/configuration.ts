// src/config.ts
import { existsSync } from "node:fs"
import { z } from "zod"

// En producción normalmente no hay .env y las variables vienen del entorno.
// loadEnvFile no sobrescribe variables que ya existan.
if (existsSync(".env")) process.loadEnvFile()

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  // Solo el origen: better-auth le añade su basePath (/api/auth).
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  // Firma las cookies y los tokens de sesión. Better Auth avisa por debajo de
  // 32 caracteres y en producción rechaza su secreto por defecto.
  BETTER_AUTH_SECRET: z.string().min(32),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error(`Configuración inválida:\n${z.prettifyError(parsed.error)}`)
  process.exit(1)
}

export const CONFIG = Object.freeze(parsed.data)
