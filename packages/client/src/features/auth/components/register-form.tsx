import { useNavigate } from "@tanstack/react-router"
import { type SubmitEventHandler, useState } from "react"
import { Button } from "#/core/design-system/button"
import { TextField } from "#/core/design-system/text-field"
import { authClient } from "#/features/auth/auth-client"
import { AuthCard, AuthLink } from "#/features/auth/components/auth-card"

export function RegisterForm() {
  const navigate = useNavigate()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string>()

  const handleSubmit: SubmitEventHandler = async (e) => {
    e.preventDefault()

    const formData = new FormData(e.target)

    const name = formData.get("name")?.toString()
    const email = formData.get("email")?.toString()
    const password = formData.get("password")?.toString()

    if (!name || !email || !password) return

    setIsPending(true)
    setError(undefined)

    const { error } = await authClient.signUp.email({
      email,
      name,
      password,
    })

    setIsPending(false)

    if (error) {
      setError(error.message ?? "No se ha podido crear la cuenta")
      return
    }

    navigate({ to: "/" })
  }

  return (
    <AuthCard
      title="Crear cuenta"
      description="Regístrate para empezar a monitorizar tus webs"
      onSubmit={handleSubmit}
      error={error}
      footer={
        <>
          ¿Ya tienes cuenta? <AuthLink to="/login">Inicia sesión</AuthLink>
        </>
      }
    >
      <TextField
        required
        label="Nombre"
        name="name"
        placeholder="Tu nombre"
        autoComplete="name"
      />
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
        autoComplete="new-password"
      />
      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending ? "Cargando…" : "Crear cuenta"}
      </Button>
    </AuthCard>
  )
}
