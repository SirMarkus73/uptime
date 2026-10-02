import { createFileRoute } from "@tanstack/react-router"
import { MonitorDetailPage } from "#/features/monitors/pages/monitor-detail-page"
import { MonitorNotFoundPage } from "#/features/monitors/pages/monitor-not-found-page"

export const Route = createFileRoute("/dashboard/monitors/$monitorId")({
  component: RouteComponent,
  notFoundComponent: MonitorNotFoundPage,
})

function RouteComponent() {
  const { monitorId } = Route.useParams()

  return <MonitorDetailPage monitorId={monitorId} />
}
