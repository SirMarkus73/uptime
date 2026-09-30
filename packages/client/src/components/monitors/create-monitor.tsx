import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import type { SubmitEventHandler } from "react"
import { $api } from "#/lib/fetchClient"

export function CreateMonitor() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const listQueryKey = $api.queryOptions("get", "/api/monitors").queryKey

  const { mutate, isPending, isSuccess, isError, error } = $api.useMutation(
    "post",
    "/api/monitors",
    {
      onError: (e) => {
        if (e.statusCode === 401) {
          navigate({ to: "/login" })
        }
      },
      onSuccess() {
        queryClient.invalidateQueries({ queryKey: listQueryKey })
      },
    },
  )

  const handleSubmit: SubmitEventHandler = (e) => {
    e.preventDefault()

    const formData = new FormData(e.target)

    const monitorName = formData.get("monitor-name")?.toString().trim()
    const monitorUrl = formData.get("monitor-url")?.toString().trim()

    if (!monitorName || !monitorUrl) return

    mutate({
      body: {
        webPage: monitorUrl,
        name: monitorName,
      },
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-lg shadow-black/30"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500">
          Monitor name
          <input
            id="monitor-name"
            name="monitor-name"
            placeholder="Mi web"
            autoComplete="off"
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm font-normal normal-case tracking-normal text-neutral-100 placeholder:text-neutral-600 outline-none transition-colors focus:border-emerald-500/60"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500">
          Monitor url
          <input
            id="monitor-url"
            name="monitor-url"
            placeholder="https://www.example.com"
            autoComplete="off"
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm font-normal normal-case tracking-normal text-neutral-100 placeholder:text-neutral-600 outline-none transition-colors focus:border-emerald-500/60"
          />
        </label>
      </div>
      {error?.statusCode === 400 && (
        <ul className="list-inside list-disc rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error.message?.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <button
        type="submit"
        disabled={error?.statusCode === 429}
        className="self-end rounded-lg bg-emerald-500 px-4 py-2 font-medium text-neutral-950 transition hover:bg-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {!isSuccess && !isError && !isPending && "Crear monitor"}
        {isPending && "Cargando..."}

        {isSuccess && !isPending && "Creado correctamente"}
        {isError &&
          error?.statusCode === 429 &&
          !isPending &&
          "Espera un poco vas demasiado rápido"}
        {isError &&
          error?.statusCode !== 429 &&
          !isPending &&
          "Error al crear el monitor"}
      </button>
    </form>
  )
}
