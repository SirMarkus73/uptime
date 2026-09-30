import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { authClient } from "#/lib/authClient"
import { $api } from "#/lib/fetchClient"

export const Route = createFileRoute("/")({ component: Home })

function Home() {
  const [url, setUrl] = useState("")

  const { data: sessionData } = authClient.useSession()

  const { data, isEnabled, error, isLoading, isFetching, refetch } =
    $api.useQuery(
      "get",
      "/api/uptime",
      { params: { query: { url } } },
      { enabled: url.length > 0 },
    )

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_60%)]">
      <div className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-20">
        <header className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Uptime</h1>
          <p className="mt-2 text-neutral-400">
            {sessionData?.user
              ? `Hola ${sessionData.user.name} comprueba si una web está disponible`
              : "Comprueba si una web está disponible"}
          </p>
        </header>

        <form
          className="flex gap-2 rounded-xl border border-neutral-800 bg-neutral-900/80 p-2 shadow-lg shadow-black/30 focus-within:border-emerald-500/60 transition-colors"
          onSubmit={(e) => {
            e.preventDefault()

            const formData = new FormData(e.currentTarget)

            const newUrl = formData.get("url")?.toString().trim()

            if (!newUrl) return
            if (newUrl === url) refetch()
            setUrl(newUrl)
          }}
        >
          <label htmlFor="url" className="sr-only">
            URL a comprobar
          </label>
          <input
            id="url"
            name="url"
            type="text"
            placeholder="https://www.example.com"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent px-3 text-neutral-100 placeholder:text-neutral-500 outline-none"
          />
          <button
            type="submit"
            disabled={isFetching}
            className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-neutral-950 transition hover:bg-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isFetching ? "Comprobando…" : "Comprobar"}
          </button>
        </form>

        {!isEnabled && (
          <p className="text-center text-sm text-neutral-500">
            Introduce una url para probarla
          </p>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error.statusCode === 429 &&
              "Has hecho demasiadas peticiones. Espera un momento e inténtalo de nuevo."}
            {error.statusCode === 400 &&
              (Array.isArray(error.message)
                ? error.message.join(", ")
                : error.message)}
          </div>
        )}

        {isLoading && (
          <div className="h-40 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900" />
        )}

        {!error && data && (
          <article className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-xl shadow-black/40">
            <div className="flex items-center justify-between gap-4 border-b border-neutral-800 px-5 py-4">
              <h2 className="truncate font-mono text-sm text-neutral-300">
                {url}
              </h2>
              <span
                className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                  data.isUp
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-red-500/15 text-red-400"
                }`}
              >
                <span className="relative flex size-2">
                  <span
                    className={`absolute inline-flex size-full animate-ping rounded-full opacity-75 ${
                      data.isUp ? "bg-emerald-400" : "bg-red-400"
                    }`}
                  />
                  <span
                    className={`relative inline-flex size-2 rounded-full ${
                      data.isUp ? "bg-emerald-400" : "bg-red-400"
                    }`}
                  />
                </span>
                {data.isUp ? "Operativa" : "Caída"}
              </span>
            </div>

            <dl className="grid grid-cols-3 divide-x divide-neutral-800">
              <Stat label="Código" value={data.statusCode ?? "—"} />
              <Stat
                label="Respuesta"
                value={`~${data.responseTimeMs.toFixed(2)} ms`}
              />
              <Stat
                label="Comprobado"
                value={new Date(data.checkedAt).toLocaleTimeString()}
              />
            </dl>

            {data.fetchError && (
              <p className="border-t border-neutral-800 px-5 py-3 font-mono text-xs text-red-300">
                {data.fetchError}
              </p>
            )}
          </article>
        )}
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-5 py-4">
      <dt className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
