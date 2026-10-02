import { tv } from "tailwind-variants"
import { RelativeTime } from "#/core/design-system/relative-time"
import { formatResponseTime } from "#/core/lib/helpers"
import type { MonitorCheck } from "../../interfaces/monitor"

const checkRow = tv({
  slots: {
    dot: "size-2 rounded-full",
    // Barra de LEDs apagados con los encendidos encima, proporcional al tiempo de respuesta.
    bar: "bg-leds hidden h-2.5 text-neutral-800 sm:block",
    barFill: "bg-leds block h-full min-w-1.5",
  },
  variants: {
    isUp: {
      true: { dot: "bg-up", barFill: "text-up" },
      false: { dot: "bg-down", barFill: "text-down" },
    },
  },
})

type MonitorCheckHistoryProps = {
  checks: MonitorCheck[]
}

export function MonitorCheckHistory({ checks }: MonitorCheckHistoryProps) {
  const upCount = checks.filter((check) => check.isUp).length
  const slowestMs = Math.max(...checks.map((check) => check.responseTimeMs))

  return (
    <section aria-labelledby="check-history" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="check-history" className="text-sm font-medium text-neutral-400">
          Últimas comprobaciones
        </h2>
        {checks.length > 0 && (
          <p className="text-sm text-neutral-500">
            <span className="text-neutral-200 tabular-nums">
              {upCount} de {checks.length}
            </span>{" "}
            correctas
          </p>
        )}
      </div>

      {checks.length === 0 ? (
        <p className="rounded-2xl border border-dotted border-neutral-800 bg-neutral-900/50 px-6 py-10 text-center text-sm text-neutral-500">
          Aquí aparecerán las comprobaciones que hagas de esta web.
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-xl shadow-black/40">
          {checks.map((check) => (
            <CheckRow key={check.id} check={check} slowestMs={slowestMs} />
          ))}
        </ol>
      )}
    </section>
  )
}

type CheckRowProps = {
  check: MonitorCheck
  slowestMs: number
}

function CheckRow({ check, slowestMs }: CheckRowProps) {
  const styles = checkRow({ isUp: check.isUp })
  const barWidth = slowestMs > 0 ? (check.responseTimeMs / slowestMs) * 100 : 0

  return (
    <li className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-4 px-5 py-3.5 sm:grid-cols-[auto_7rem_1fr_5rem_8rem]">
      <span className={styles.dot()}>
        <span className="sr-only">{check.isUp ? "Operativa" : "Caída"}</span>
      </span>

      {check.statusCode !== null ? (
        <span className="font-dot text-lg font-bold tabular-nums">
          {check.statusCode}
        </span>
      ) : (
        <span
          title={check.errorCode ?? undefined}
          className="truncate text-xs text-red-300"
        >
          {check.errorCode ?? "Sin respuesta"}
        </span>
      )}

      <span aria-hidden="true" className={styles.bar()}>
        <span className={styles.barFill()} style={{ width: `${barWidth}%` }} />
      </span>

      <span className="text-right text-sm text-neutral-300 tabular-nums">
        {formatResponseTime(check.responseTimeMs)}
      </span>

      <RelativeTime
        date={check.checkedAt}
        className="text-right text-xs text-neutral-500"
      />
    </li>
  )
}
