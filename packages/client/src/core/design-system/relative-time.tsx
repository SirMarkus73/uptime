import { formatDateTime, formatRelativeTime } from "#/core/lib/helpers"
import { useNow } from "#/core/lib/use-now"

type RelativeTimeProps = {
  date: string
  className?: string
}

// "hace 5 segundos" que se va actualizando solo; la fecha exacta, al pasar el ratón.
export function RelativeTime({ date, className }: RelativeTimeProps) {
  const now = useNow()

  return (
    <time dateTime={date} title={formatDateTime(date)} className={className}>
      {formatRelativeTime(date, now)}
    </time>
  )
}
