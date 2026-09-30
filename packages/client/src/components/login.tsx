import { useNavigate } from "@tanstack/react-router"
import type { SubmitEventHandler } from "react"
import { authClient } from "#/lib/authClient"

export function Login() {
  const navigate = useNavigate()

  const handleSubmit: SubmitEventHandler = async (e) => {
    e.preventDefault()

    const formData = new FormData(e.target)

    const email = formData.get("email")?.toString()
    const password = formData.get("password")?.toString()

    if (!email || !password) return

    await authClient.signIn.email({
      email,
      password,
    })

    navigate({ to: "/" })
  }

  return (
    <main className="bg-neutral-900 min-h-screen text-white p-5 grid place-items-center">
      <form
        onSubmit={handleSubmit}
        className="grid gap-2 border border-neutral-400 rounded-lg p-4 *:flex *:gap-2 *:*:border *:*:rounded-lg"
      >
        <label>
          Correo electrónico
          <input id="email" name="email" />
        </label>

        <label>
          Contraseña
          <input id="password" name="password" />
        </label>

        <button type="submit">Enviar</button>
      </form>
    </main>
  )
}
