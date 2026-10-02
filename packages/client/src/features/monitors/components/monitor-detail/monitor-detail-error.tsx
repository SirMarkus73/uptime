import { Alert } from "#/core/design-system/alert"
import { Button } from "#/core/design-system/button"

type MonitorDetailErrorProps = {
  isRateLimited: boolean
  isRetrying: boolean
  onRetry: () => void
}

export function MonitorDetailError({
  isRateLimited,
  isRetrying,
  onRetry,
}: MonitorDetailErrorProps) {
  return (
    <div className="flex flex-col items-start gap-4">
      <Alert>
        {isRateLimited
          ? "Has hecho demasiadas peticiones. Espera un momento y vuelve a intentarlo."
          : "No se ha podido cargar el monitor. Comprueba tu conexión y vuelve a intentarlo."}
      </Alert>
      <Button variant="secondary" onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? "Reintentando…" : "Reintentar"}
      </Button>
    </div>
  )
}
