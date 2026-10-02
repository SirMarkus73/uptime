import { useMonitors } from "../api/queries"
import { MonitorListItem } from "./monitor-list-item"

export function MonitorList() {
  const { data } = useMonitors()

  return (
    <ul className="flex flex-col divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-xl shadow-black/40 empty:hidden">
      {data?.map((monitor) => {
        return <MonitorListItem key={monitor.id} monitor={monitor} />
      })}
    </ul>
  )
}
