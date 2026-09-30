import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  // Sin path: el cliente añade /api/auth, igual que el servidor.
  baseURL: window.location.origin,
})
