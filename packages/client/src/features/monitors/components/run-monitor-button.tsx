import { Button } from "#/core/design-system/button"
import { useRunMonitor } from "../api/mutations"

type RunMonitorButtonProps = {
  monitorId: string
  disabled?: boolean
}

export function RunMonitorButton({
  monitorId,
  disabled = false,
}: RunMonitorButtonProps) {
  const { mutate: runMonitor, isPending } = useRunMonitor(monitorId)

  const handleClick = () => {
    runMonitor()
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      className="shrink-0"
      disabled={disabled || isPending}
      onClick={handleClick}
    >
      Run
    </Button>
  )
}
