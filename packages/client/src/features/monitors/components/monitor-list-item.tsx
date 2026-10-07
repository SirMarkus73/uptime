import { useQueryClient } from "@tanstack/react-query"
import { Spinner } from "#/core/design-system/spinner"
import { StatusDot } from "#/core/design-system/status-dot"
import { isTempId } from "#/core/lib/temp-id"
import { monitorQueryOptions } from "../api/queries"
import type {
  MonitorDetail,
  MonitorListItem as MonitorListItemType,
} from "../interfaces/monitor"
import { DeleteMonitorButton } from "./monitor-action-buttons/delete-monitor-button"
import { RunMonitorButton } from "./monitor-action-buttons/run-monitor-button"
import { ViewMonitorButton } from "./monitor-action-buttons/view-monitor-button"

type MonitorListItemProps = {
  monitor: MonitorListItemType
}

export function MonitorListItem({ monitor }: MonitorListItemProps) {
  const queryClient = useQueryClient()

  const isCreating = isTempId(monitor.id)

  const ensureMonitorLoaded = (monitorId: MonitorDetail["id"]) => () => {
    queryClient.query(monitorQueryOptions(monitorId))
  }

  return (
    <li
      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-neutral-800/40"
      key={monitor.id}
      onMouseEnter={isCreating ? undefined : ensureMonitorLoaded(monitor.id)}
    >
      {isCreating ? (
        <Spinner size="sm" label="Creando monitor" />
      ) : (
        <StatusDot
          status={
            monitor.lastCheck === null
              ? "unknown"
              : monitor.lastCheck.isUp
                ? "up"
                : "down"
          }
        />
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-medium text-neutral-100">
          {monitor.name}
        </h3>
        <small className="block truncate font-mono text-xs text-neutral-500">
          {monitor.webPage}
        </small>
      </div>
      <RunMonitorButton monitorId={monitor.id} disabled={isCreating} />
      <ViewMonitorButton monitorId={monitor.id} disabled={isCreating} />
      <DeleteMonitorButton
        monitorId={monitor.id}
        monitorName={monitor.name}
        disabled={isCreating}
      />
    </li>
  )
}
