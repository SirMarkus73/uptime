import { TrashIcon } from "lucide-react"
import { useRef } from "react"
import {
  AlertDialog,
  AlertDialogActions,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "#/core/design-system/alert-dialog"
import { buttonStyles } from "#/core/design-system/button"
import { Spinner } from "#/core/design-system/spinner"
import { useDeleteMonitor } from "../../api/mutations"
import type { MonitorDetail } from "../../interfaces/monitor"

type DeleteMonitorButtonProps = {
  monitorId: MonitorDetail["id"]
  monitorName: MonitorDetail["name"]
  disabled: boolean
}

export function DeleteMonitorButton({
  monitorId,
  monitorName,
  disabled,
}: DeleteMonitorButtonProps) {
  const { mutate: deleteMonitor, isPending: isDeleting } =
    useDeleteMonitor(monitorId)

  // La eliminación optimista desmonta este componente, así que se espera a que
  // termine la animación de cierre del diálogo antes de lanzarla.
  const isConfirmedRef = useRef(false)

  const handleConfirm = () => {
    isConfirmedRef.current = true
  }

  const handleOpenChangeComplete = (open: boolean) => {
    if (open || !isConfirmedRef.current) return

    isConfirmedRef.current = false
    deleteMonitor()
  }

  return (
    <AlertDialog onOpenChangeComplete={handleOpenChangeComplete}>
      <AlertDialogTrigger
        aria-label="Eliminar monitor"
        disabled={disabled || isDeleting}
        className={buttonStyles({ variant: "danger", size: "sm" })}
      >
        {isDeleting ? (
          <Spinner label="Eliminando monitor" />
        ) : (
          <TrashIcon className="size-5" />
        )}
      </AlertDialogTrigger>
      <AlertDialogPopup tone="danger">
        <AlertDialogTitle>¿Eliminar monitor?</AlertDialogTitle>
        <AlertDialogDescription>
          Se borrará <strong className="text-neutral-100">{monitorName}</strong>{" "}
          junto con su historial de comprobaciones. No se puede deshacer.
        </AlertDialogDescription>
        <AlertDialogActions>
          <AlertDialogClose>Cancelar</AlertDialogClose>
          <AlertDialogClose variant="destructive" onClick={handleConfirm}>
            Eliminar monitor
          </AlertDialogClose>
        </AlertDialogActions>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
