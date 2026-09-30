import { useNavigate } from "@tanstack/react-router"
import { type SubmitEventHandler, useState } from "react"
import { authClient } from "#/lib/authClient"
import { AuthCard, AuthField, AuthLink, AuthSubmit } from "./auth-form"

export function Register() {
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
      <AuthField
        label="Nombre"
        name="name"
        placeholder="Tu nombre"
        autoComplete="name"
      />
      <AuthField
        label="Correo electrónico"
        name="email"
        type="email"
        placeholder="tu@correo.com"
        autoComplete="email"
      />
      <AuthField
        label="Contraseña"
        name="password"
        type="password"
        placeholder="••••••••"
        autoComplete="new-password"
      />
      <AuthSubmit isPending={isPending}>Crear cuenta</AuthSubmit>
    </AuthCard>
  )
}
