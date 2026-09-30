import { StatusDot } from "#/core/design-system/status-dot"
import { useMonitors } from "../api/queries"
import { RunMonitorButton } from "./run-monitor-button"

export function MonitorList() {
  const { data } = useMonitors()

  return (
    <ul className="flex flex-col divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-xl shadow-black/40 empty:hidden">
      {data?.map((monitor) => (
        <li
          className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-neutral-800/40"
          key={monitor.id}
        >
          <StatusDot
            status={
              monitor.isUp === null ? "unknown" : monitor.isUp ? "up" : "down"
            }
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium text-neutral-100">
              {monitor.name}
            </h3>
            <small className="block truncate font-mono text-xs text-neutral-500">
              {monitor.webPage}
            </small>
          </div>
          <RunMonitorButton monitorId={monitor.id} />
        </li>
      ))}
    </ul>
  )
}
