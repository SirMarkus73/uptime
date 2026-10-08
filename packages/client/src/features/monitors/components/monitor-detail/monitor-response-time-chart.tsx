import { format } from "date-fns"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts"
import { formatDateTime, formatResponseTime } from "#/core/lib/helpers"
import type { CheckStat, CheckStatsList } from "../../interfaces/check"

// Colores del tema (`styles.css`) para los atributos SVG de Recharts.
const colors = {
  line: "var(--color-neutral-300)",
  grid: "var(--color-neutral-800)",
  axis: "var(--color-neutral-500)",
  surface: "var(--color-neutral-900)",
  up: "var(--color-up)",
  down: "var(--color-down)",
}

type MonitorResponseTimeChartProps = {
  checks: CheckStatsList
}

export function MonitorResponseTimeChart({
  checks,
}: MonitorResponseTimeChartProps) {
  // Con un solo punto no hay evolución que enseñar.
  if (checks.length < 2) return null

  // La API devuelve primero la más reciente; el gráfico se lee de izquierda a derecha.
  const data = [...checks].reverse()
  const averageMs =
    checks.reduce((total, check) => total + check.responseTimeMs, 0) /
    checks.length

  return (
    <section aria-labelledby="response-time" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="response-time" className="text-sm font-medium text-neutral-400">
          Tiempo de respuesta
        </h2>
        <p className="text-sm text-neutral-500">
          Media{" "}
          <span className="text-neutral-200 tabular-nums">
            {formatResponseTime(averageMs)}
          </span>
        </p>
      </div>

      {/* El detalle accesible de cada comprobación está en la lista de debajo. */}
      <figure
        aria-hidden="true"
        className="h-56 rounded-2xl border border-neutral-800 bg-neutral-900 py-4 pr-5 shadow-xl shadow-black/40"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
            accessibilityLayer={false}
          >
            <defs>
              <linearGradient
                id="response-time-fill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={colors.line} stopOpacity={0.18} />
                <stop offset="100%" stopColor={colors.line} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke={colors.grid}
              strokeDasharray="2 4"
            />
            <XAxis
              dataKey="checkedAt"
              tickFormatter={(date: string) => format(date, "HH:mm:ss")}
              tick={{ fill: colors.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <YAxis
              dataKey="responseTimeMs"
              tickFormatter={(ms: number) => `${Math.round(ms)} ms`}
              tick={{ fill: colors.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={64}
            />

            <Tooltip
              content={ResponseTimeTooltip}
              cursor={{ stroke: colors.axis, strokeDasharray: "2 4" }}
              isAnimationActive={false}
            />

            <Area
              type="monotone"
              dataKey="responseTimeMs"
              stroke={colors.line}
              strokeWidth={2}
              fill="url(#response-time-fill)"
              dot={({ cx, cy, payload, index }) => (
                <CheckDot key={index} cx={cx} cy={cy} check={payload} />
              )}
              activeDot={({ cx, cy, payload }) => (
                <CheckDot cx={cx} cy={cy} check={payload} r={6} />
              )}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </figure>
    </section>
  )
}

type CheckDotProps = {
  cx?: number
  cy?: number
  check: CheckStat
  r?: number
}

// Cada punto lleva el color del estado de la comprobación, con un anillo del
// color del panel para separarlo de la línea.
function CheckDot({ cx, cy, check, r = 4 }: CheckDotProps) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={check.isUp ? colors.up : colors.down}
      stroke={colors.surface}
      strokeWidth={2}
    />
  )
}

function ResponseTimeTooltip({ active, payload }: TooltipContentProps) {
  const check = payload?.[0]?.payload as CheckStat | undefined
  if (!active || !check) return null

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-neutral-700 bg-neutral-950/95 px-3 py-2 text-xs shadow-lg shadow-black/50">
      <span className="text-sm text-neutral-100 tabular-nums">
        {formatResponseTime(check.responseTimeMs)}
      </span>
      <span className="flex items-center gap-1.5 text-neutral-300">
        <span
          className={`size-2 rounded-full ${check.isUp ? "bg-up" : "bg-down"}`}
        />
        {check.isUp ? "Operativa" : "Caída"} ·{" "}
        {check.statusCode ?? check.errorCode ?? "Sin respuesta"}
      </span>
      <span className="text-neutral-500">
        {formatDateTime(check.checkedAt)}
      </span>
    </div>
  )
}
