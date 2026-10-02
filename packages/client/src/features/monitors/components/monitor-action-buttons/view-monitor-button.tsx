import { Link } from "@tanstack/react-router"
import { EyeIcon } from "lucide-react"
import { buttonStyles } from "#/core/design-system/button"
import type { MonitorDetail } from "../../interfaces/monitor"

type ViewMonitorButtonProps = {
  monitorId: MonitorDetail["id"]
  disabled: boolean
}

export function ViewMonitorButton({
  monitorId,
  disabled,
}: ViewMonitorButtonProps) {
  const style = buttonStyles({ variant: "secondary", size: "sm" })

  return (
    <Link
      to="/dashboard/monitors/$monitorId"
      params={{ monitorId }}
      className={style}
      disabled={disabled}
    >
      <EyeIcon className="size-5" />
    </Link>
  )
}
