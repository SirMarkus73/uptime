import { useNavigate } from "@tanstack/react-router"
import { type SubmitEventHandler, useState } from "react"
import { Button } from "#/core/design-system/button"
import { TextField } from "#/core/design-system/text-field"
import { authClient } from "#/features/auth/auth-client"
import { AuthCard, AuthLink } from "#/features/auth/components/auth-card"

export function LoginForm() {
  const navigate = useNavigate()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string>()

  const handleSubmit: SubmitEventHandler = async (e) => {
    e.preventDefault()

    const formData = new FormData(e.target)

    const email = formData.get("email")?.toString()
    const password = formData.get("password")?.toString()

    if (!email || !password) return

    setIsPending(true)
    setError(undefined)

    const { error } = await authClient.signIn.email({
      email,
      password,
    })

    setIsPending(false)

    if (error) {
      setError(error.message ?? "No se ha podido iniciar sesión")
      return
    }

    navigate({ to: "/" })
  }

  return (
    <AuthCard
      title="Iniciar sesión"
      description="Accede para gestionar tus monitores"
      onSubmit={handleSubmit}
      error={error}
      footer={
        <>
          ¿No tienes cuenta? <AuthLink to="/register">Regístrate</AuthLink>
        </>
      }
    >
      <TextField
        required
        label="Correo electrónico"
        name="email"
        type="email"
        placeholder="tu@correo.com"
        autoComplete="email"
      />
      <TextField
        required
        label="Contraseña"
        name="password"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
      />
      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending ? "Cargando…" : "Entrar"}
      </Button>
    </AuthCard>
  )
}
