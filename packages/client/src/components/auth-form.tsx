import { Link } from "@tanstack/react-router"
import type { ComponentProps, ReactNode, SubmitEventHandler } from "react"

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
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-dot text-4xl font-bold tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-sm text-neutral-400">{description}</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/40"
        >
          {children}

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">{footer}</p>
      </div>
    </main>
  )
}

interface AuthFieldProps extends ComponentProps<"input"> {
  label: string
  name: string
}

export function AuthField({ label, name, ...props }: AuthFieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500">
      {label}
      <input
        id={name}
        name={name}
        required
        className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm font-normal normal-case tracking-normal text-neutral-100 placeholder:text-neutral-600 outline-none transition-colors focus:border-neutral-400"
        {...props}
      />
    </label>
  )
}

export function AuthSubmit({
  isPending,
  children,
}: {
  isPending: boolean
  children: ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="mt-2 rounded-lg bg-accent px-4 py-2 font-medium text-neutral-950 transition hover:bg-accent-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? "Cargando…" : children}
    </button>
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
