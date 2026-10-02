import { ExternalLink } from "lucide-react"
import { tv, type VariantProps } from "tailwind-variants"
import { Button } from "#/core/design-system/button"
import { RelativeTime } from "#/core/design-system/relative-time"
import { formatResponseTime } from "#/core/lib/helpers"
import { useRunMonitor } from "../../api/mutations"
import type { MonitorCheck, MonitorDetail } from "../../interfaces/monitor"

// El estado se pinta como un rótulo de LEDs: encendido en verde o rojo,
// apagado en gris si aún no hay datos.
const statusSign = tv({
  base: "font-dot text-6xl leading-none font-black tracking-tight break-words sm:text-8xl",
  variants: {
    status: {
      up: "text-up [text-shadow:0_0_48px_color-mix(in_oklab,var(--color-up)_35%,transparent)]",
      down: "text-down [text-shadow:0_0_48px_color-mix(in_oklab,var(--color-down)_35%,transparent)]",
      unknown: "text-neutral-700",
      checking: "text-neutral-300 motion-safe:animate-pulse",
    },
  },
})

type MonitorStatus = NonNullable<VariantProps<typeof statusSign>["status"]>

const statusLabels: Record<MonitorStatus, string> = {
  up: "Operativa",
  down: "Caída",
  unknown: "Sin datos",
  checking: "Comprobando",
}

function LastCheckSummary({ check }: { check: MonitorCheck | undefined }) {
  if (!check) return "Comprueba la web para registrar su primer estado."

  const when = <RelativeTime date={check.checkedAt} />

  if (check.statusCode === null) {
    return (
      <>
        No respondió{check.errorCode && ` (${check.errorCode})`} {when}.
      </>
    )
  }

  return (
    <>
      Respondió con {check.statusCode} en{" "}
      {formatResponseTime(check.responseTimeMs)} {when}.
    </>
  )
}

type MonitorOverviewProps = {
  monitor: MonitorDetail
}

export function MonitorOverview({ monitor }: MonitorOverviewProps) {
  const { mutate: runMonitor, isPending: isRunning } = useRunMonitor(monitor.id)

  const [lastCheck] = monitor.checks
  const status: MonitorStatus = isRunning
    ? "checking"
    : !lastCheck
      ? "unknown"
      : lastCheck.isUp
        ? "up"
        : "down"

  return (
    <section aria-labelledby="monitor-name" className="flex flex-col gap-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1
            id="monitor-name"
            className="truncate text-2xl font-medium text-neutral-100"
          >
            {monitor.name}
          </h1>
          <a
            href={monitor.webPage}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded text-sm text-neutral-500 transition-colors hover:text-neutral-200"
          >
            <span className="truncate">{monitor.webPage}</span>
            <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="sr-only">(se abre en una pestaña nueva)</span>
          </a>
        </div>

        <Button onClick={runMonitor} disabled={isRunning} className="shrink-0">
          {isRunning ? "Comprobando…" : "Comprobar ahora"}
        </Button>
      </div>

      <div>
        {/* Solo se anuncia el estado: la frase cambia cada segundo. */}
        <p aria-live="polite" className={statusSign({ status })}>
          {statusLabels[status]}
        </p>
        <p className="mt-5 max-w-prose text-neutral-400">
          {isRunning ? (
            "Haciendo una petición a la web…"
          ) : (
            <LastCheckSummary check={lastCheck} />
          )}
        </p>
      </div>
    </section>
  )
}
