import { CreateMonitor } from "./create-monitor"
import { MonitorList } from "./monitor-list"

export function Monitors() {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 px-4 pb-20">
      <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-500">
        Monitores
      </h2>
      <CreateMonitor />
      <MonitorList />
    </section>
  )
}
