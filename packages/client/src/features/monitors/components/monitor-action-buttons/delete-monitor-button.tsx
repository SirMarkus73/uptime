import { TrashIcon } from "lucide-react"
import { Button } from "#/core/design-system/button"
import { Spinner } from "#/core/design-system/spinner"
import { useDeleteMonitor } from "../../api/mutations"
import type { MonitorDetail } from "../../interfaces/monitor"

type DeleteMonitorButtonProps = {
  monitorId: MonitorDetail["id"]
  disabled: boolean
}

export function DeleteMonitorButton({
  monitorId,
  disabled,
}: DeleteMonitorButtonProps) {
  const { mutate: deleteMonitor, isPending: isDeleting } =
    useDeleteMonitor(monitorId)

  const handleClick = () => {
    deleteMonitor()
  }

  return (
    <Button
      variant="danger"
      disabled={disabled || isDeleting}
      size="sm"
      onClick={handleClick}
    >
      {isDeleting ? (
        <Spinner label="Eliminando monitor" />
      ) : (
        <TrashIcon className="size-5" />
      )}
    </Button>
  )
}
