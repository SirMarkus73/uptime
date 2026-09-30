import { Link } from "@tanstack/react-router"
import type { ComponentProps, ReactNode, SubmitEventHandler } from "react"
import { Alert } from "#/core/design-system/alert"

interface AuthCardProps {
  title: string
  description: string
  onSubmit: SubmitEventHandler
  error?: string
  footer: ReactNode
  children: ReactNode
}

export function AuthCard({
  title,
  description,
  onSubmit,
  error,
  footer,
  children,
}: AuthCardProps) {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="font-dot text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-neutral-400">{description}</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/40"
      >
        {children}

        {error && <Alert>{error}</Alert>}
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">{footer}</p>
    </div>
  )
}

export function AuthLink(props: ComponentProps<typeof Link>) {
  return (
    <Link
      className="font-medium text-neutral-100 underline decoration-dotted underline-offset-4 transition-colors hover:text-white"
      {...props}
    />
  )
}
