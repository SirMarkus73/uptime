import type { SubmitEventHandler } from "react"
import { Alert } from "#/core/design-system/alert"
import { Button } from "#/core/design-system/button"
import { TextField } from "#/core/design-system/text-field"
import { useCreateMonitor } from "../api/mutations"

export function CreateMonitorForm() {
  const { mutate, isPending, isSuccess, isError, error } = useCreateMonitor()

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
        <TextField
          label="Monitor name"
          name="monitor-name"
          placeholder="Mi web"
          autoComplete="off"
        />
        <TextField
          label="Monitor url"
          name="monitor-url"
          placeholder="https://www.example.com"
          autoComplete="off"
          className="font-mono"
        />
      </div>
      {error?.statusCode === 400 && (
        <Alert>
          <ul className="list-inside list-disc">
            {error.message?.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Alert>
      )}
      <Button
        type="submit"
        disabled={error?.statusCode === 429}
        className="self-end"
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
      </Button>
    </form>
  )
}
