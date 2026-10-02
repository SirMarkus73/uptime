import { format, formatDistanceStrict } from "date-fns"
import { es } from "date-fns/locale"

export function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000
}

// "hace 3 minutos", "hace 2 días"… respecto a `now`. Si el reloj del cliente va
// por detrás del servidor no se muestra "dentro de 2 segundos": se queda en 0.
export function formatRelativeTime(
  date: string | Date,
  now: number | Date = Date.now(),
): string {
  const base = Math.max(new Date(now).getTime(), new Date(date).getTime())
  return formatDistanceStrict(date, base, { addSuffix: true, locale: es })
}

// "2 de octubre de 2026 a las 21:34:20"
export function formatDateTime(date: string | Date): string {
  return format(date, "PPPpp", { locale: es })
}

export function formatResponseTime(ms: number): string {
  return `${Math.round(ms).toLocaleString("es")} ms`
}
