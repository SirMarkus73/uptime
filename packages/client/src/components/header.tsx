import { useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useRouter } from "@tanstack/react-router"
import { authClient } from "#/lib/authClient"

const navLinkClass =
  "rounded-lg px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-neutral-800/60 hover:text-neutral-100"

export function Header() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const router = useRouter()

  const { data: sessionData, isPending } = authClient.useSession()

  const handleSignOut = async () => {
    await authClient.signOut()
    queryClient.invalidateQueries()
    router.invalidate()
    navigate({ to: "/login" })
  }

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-neutral-100"
        >
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
          </span>
          Uptime
        </Link>

        <div className="flex items-center gap-1">
          <Link
            to="/"
            className={navLinkClass}
            activeProps={{ className: "bg-neutral-800/60 text-neutral-100" }}
            activeOptions={{ exact: true }}
          >
            Inicio
          </Link>

          {isPending ? (
            <div className="ml-1 h-8 w-32 animate-pulse rounded-lg bg-neutral-800/60" />
          ) : sessionData?.user ? (
            <>
              <span className="ml-1 flex items-center gap-2 px-2 text-sm text-neutral-300">
                <span className="grid size-7 place-items-center rounded-full bg-emerald-500/15 text-xs font-semibold uppercase text-emerald-400">
                  {sessionData.user.name.charAt(0)}
                </span>
                <span className="max-w-40 truncate">
                  {sessionData.user.name}
                </span>
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-lg border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 active:scale-95"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={navLinkClass}
                activeProps={{
                  className: "bg-neutral-800/60 text-neutral-100",
                }}
              >
                Iniciar sesión
              </Link>
              <Link
                to="/register"
                className="ml-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-neutral-950 transition hover:bg-emerald-400 active:scale-95"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
