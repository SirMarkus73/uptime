import { useNavigate } from "@tanstack/react-router"
import { $api } from "#/lib/fetchClient"
import { RunMonitorButton } from "./run-monitor-btn"

export function MonitorList() {
  const navigate = useNavigate()
  const { data, error } = $api.useQuery("get", "/api/monitors")

  if (error?.statusCode === 401) {
    navigate({ to: "/login" })
  }

  return (
    <ul className="flex flex-col divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-xl shadow-black/40 empty:hidden">
      {data?.map((monitor) => (
        <li
          className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-neutral-800/40"
          key={monitor.id}
        >
          <span className="relative flex size-2.5 shrink-0">
            {monitor.isUp === true && (
              <>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
              </>
            )}
            {monitor.isUp === false && (
              <>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-rose-400" />
              </>
            )}
            {monitor.isUp === null && (
              <span className="relative inline-flex size-2.5 rounded-full bg-neutral-600" />
            )}
          </span>
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
