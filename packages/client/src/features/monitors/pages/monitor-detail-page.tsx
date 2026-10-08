import { Link, notFound } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import {
  isMonitorNotFoundError,
  useMonitor,
  useMonitorChecksStats,
} from "../api/queries"
import { MonitorCheckHistory } from "../components/monitor-detail/monitor-check-history"
import { MonitorDetailError } from "../components/monitor-detail/monitor-detail-error"
import { MonitorDetailSkeleton } from "../components/monitor-detail/monitor-detail-skeleton"
import { MonitorOverview } from "../components/monitor-detail/monitor-overview"
import { MonitorResponseTimeChart } from "../components/monitor-detail/monitor-response-time-chart"
import type { MonitorDetail } from "../interfaces/monitor"

type MonitorDetailPageProps = {
  monitorId: MonitorDetail["id"]
}

export function MonitorDetailPage({ monitorId }: MonitorDetailPageProps) {
  const { data: monitor, error, isFetching, refetch } = useMonitor(monitorId)
  const { data: checks } = useMonitorChecksStats(monitorId)

  // Lo recoge el `notFoundComponent` de la ruta.
  if (isMonitorNotFoundError(error)) {
    throw notFound()
  }

  return (
    <main className="flex-1">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 pt-10 pb-20 sm:pt-14">
        <Link
          to="/"
          className="inline-flex items-center gap-2 self-start rounded text-sm text-neutral-500 transition-colors hover:text-neutral-100"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Todos los monitores
        </Link>

        {monitor ? (
          <div className="flex flex-col gap-12">
            <MonitorOverview monitor={monitor} />
            {checks && (
              <>
                <MonitorResponseTimeChart checks={checks} />
                <MonitorCheckHistory monitorId={monitorId} />
              </>
            )}
          </div>
        ) : error ? (
          <MonitorDetailError
            isRateLimited={error.statusCode === 429}
            isRetrying={isFetching}
            onRetry={() => refetch()}
          />
        ) : (
          <MonitorDetailSkeleton />
        )}
      </div>
    </main>
  )
}
