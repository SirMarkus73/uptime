import { Button } from "#/core/design-system/button"
import { useRunMonitor } from "../api/mutations"

type RunMonitorButtonProps = {
  monitorId: string
}

export function RunMonitorButton({ monitorId }: RunMonitorButtonProps) {
  const { mutate, isPending } = useRunMonitor()

  const handleClick = () => {
    mutate({
      params: {
        path: {
          monitorId,
        },
      },
    })
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      className="shrink-0"
      disabled={isPending}
      onClick={handleClick}
    >
      Run
    </Button>
  )
}
