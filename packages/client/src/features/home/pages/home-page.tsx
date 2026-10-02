import { MonitorsSection } from "#/features/monitors/components/monitors-section"
import { UptimeCheck } from "#/features/uptime-check/components/uptime-check"

export function HomePage() {
  return (
    <main className="flex-1">
      <UptimeCheck />
      <MonitorsSection />
    </main>
  )
}
