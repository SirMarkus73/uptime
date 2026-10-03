import { Pause, Play } from "lucide-react"
import { Button } from "#/core/design-system/button"
import { useToggleMonitorScheduler } from "../../api/mutations"
import type { MonitorDetail } from "../../interfaces/monitor"

type ToggleMonitorSchedulerButtonProps = {
  monitorId: MonitorDetail["id"]
  hasScheduler: MonitorDetail["hasScheduler"]
}

export function ToggleMonitorSchedulerButton({
  monitorId,
  hasScheduler,
}: ToggleMonitorSchedulerButtonProps) {
  const { toggle, isPending } = useToggleMonitorScheduler(monitorId)

  const Icon = hasScheduler ? Pause : Play

  return (
    <Button
      variant="secondary"
      className="inline-flex shrink-0 items-center gap-2"
      disabled={isPending}
      onClick={() => toggle(hasScheduler)}
    >
      <Icon aria-hidden="true" className="size-4" />
      {hasScheduler ? "Pausar" : "Reanudar"}
    </Button>
  )
}
