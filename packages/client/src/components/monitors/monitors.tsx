import { Link } from "@tanstack/react-router"
import { authClient } from "#/lib/authClient"
import { CreateMonitor } from "./create-monitor"
import { MonitorList } from "./monitor-list"

export function Monitors() {
  const { data: sessionData, isPending } = authClient.useSession()

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 px-4 pb-20">
      <h2 className="font-dot text-lg font-bold uppercase tracking-wider text-neutral-400">
        Monitores
      </h2>
      {isPending ? (
        <div className="h-48 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900" />
      ) : sessionData?.user ? (
        <>
          <CreateMonitor />
          <MonitorList />
        </>
      ) : (
        <LockedMonitors />
      )}
    </section>
  )
}

function LockedMonitors() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dotted border-neutral-800 bg-neutral-900/50 px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-white/5 text-neutral-100 ring-1 ring-white/15">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6"
          aria-hidden="true"
        >
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          <path d="M12 15v2" />
        </svg>
      </span>
      <div>
        <p className="font-medium text-neutral-100">
          Inicia sesión para crear monitores
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          Guarda tus webs y comprueba su estado cuando quieras
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/login"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-accent-hover active:scale-95"
        >
          Iniciar sesión
        </Link>
        <Link
          to="/register"
          className="rounded-lg border border-neutral-800 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800/60 hover:text-neutral-100 active:scale-95"
        >
          Crear cuenta
        </Link>
      </div>
    </div>
  )
}
