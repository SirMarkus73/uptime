import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog"
import { Drawer } from "@base-ui/react/drawer"
import { createContext, type ReactNode, use } from "react"
import { tv, type VariantProps } from "tailwind-variants"
import { useMediaQuery } from "../lib/use-media-query"
import { buttonStyles } from "./button"

// Por debajo de `sm` (40rem) se muestra como drawer inferior en lugar de diálogo centrado.
const MOBILE_QUERY = "(max-width: 39.99rem)"

const alertDialogStyles = tv({
  slots: {
    backdrop: "fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-[2px]",
    viewport: "",
    popup: "flex flex-col bg-neutral-900 outline-none",
    // Franja de LEDs que indica el tono del diálogo, como las barras del historial.
    leds: "bg-leds h-1.5 shrink-0",
    title:
      "px-6 pt-5 font-dot text-2xl font-bold tracking-tight text-neutral-100",
    description: "px-6 pt-2 pb-6 text-sm leading-relaxed text-neutral-400",
    actions: "flex flex-col-reverse gap-2 px-6",
  },
  variants: {
    kind: {
      dialog: {
        backdrop:
          "transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
        popup: [
          "fixed top-1/2 left-1/2 z-50 w-md max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2",
          "overflow-hidden rounded-xl border border-neutral-800 shadow-2xl shadow-black/50",
          "transition-[opacity,scale] duration-150 ease-out",
          "data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
          "motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100",
        ],
        actions:
          "border-t border-neutral-800 bg-neutral-950/40 py-4 sm:flex-row sm:justify-end",
      },
      // Transiciones y swipe sacados de la demo de Base UI. El popup se alarga 3rem
      // por debajo de la pantalla para que no quede hueco al estirarlo hacia arriba.
      drawer: {
        backdrop: [
          "min-h-dvh opacity-[calc(1-var(--drawer-swipe-progress))]",
          "transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0",
          "data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)]",
        ],
        viewport: "fixed inset-0 z-50 flex items-end justify-center",
        popup: [
          "-mb-12 max-h-[calc(85dvh+3rem)] w-full overflow-y-auto overscroll-contain",
          "rounded-t-2xl border-t border-neutral-800 pb-[calc(1rem+env(safe-area-inset-bottom,0px)+3rem)] shadow-2xl shadow-black/50",
          "[transform:translateY(var(--drawer-swipe-movement-y))]",
          "transition-transform duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:select-none data-swiping:duration-0",
          "data-ending-style:[transform:translateY(calc(100%-3rem+2px))] data-starting-style:[transform:translateY(calc(100%-3rem+2px))]",
          "data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)]",
          "motion-reduce:transition-none",
        ],
        // En el drawer los LEDs son el asa para arrastrarlo.
        leds: "mx-auto mt-3 w-12 rounded-full",
        title: "pt-4",
      },
    },
    tone: {
      neutral: { leds: "text-neutral-700" },
      danger: { leds: "text-down/60" },
    },
  },
  defaultVariants: {
    kind: "dialog",
    tone: "neutral",
  },
})

type Kind = NonNullable<VariantProps<typeof alertDialogStyles>["kind"]>

const KindContext = createContext<Kind>("dialog")

type AlertDialogProps = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  // Se llama al terminar la animación de apertura o cierre.
  onOpenChangeComplete?: (open: boolean) => void
  children: ReactNode
}

export function AlertDialog({ onOpenChange, ...props }: AlertDialogProps) {
  const kind: Kind = useMediaQuery(MOBILE_QUERY) ? "drawer" : "dialog"
  const handleOpenChange = (open: boolean) => onOpenChange?.(open)

  return (
    <KindContext value={kind}>
      {kind === "drawer" ? (
        // Como en el AlertDialog, pulsar fuera no lo cierra: hay que elegir una opción o deslizarlo.
        <Drawer.Root
          disablePointerDismissal
          onOpenChange={handleOpenChange}
          {...props}
        />
      ) : (
        <BaseAlertDialog.Root onOpenChange={handleOpenChange} {...props} />
      )}
    </KindContext>
  )
}

type AlertDialogTriggerProps = Omit<
  BaseAlertDialog.Trigger.Props,
  "className" | "style" | "render" | "handle" | "payload"
> & { className?: string }

export function AlertDialogTrigger(props: AlertDialogTriggerProps) {
  return use(KindContext) === "drawer" ? (
    <Drawer.Trigger {...props} />
  ) : (
    <BaseAlertDialog.Trigger {...props} />
  )
}

type AlertDialogPopupProps = Pick<
  VariantProps<typeof alertDialogStyles>,
  "tone"
> & {
  className?: string
  children: ReactNode
}

// Incluye el portal y el fondo, así que basta con meterlo dentro de <AlertDialog>.
export function AlertDialogPopup({
  tone,
  className,
  children,
}: AlertDialogPopupProps) {
  const kind = use(KindContext)
  const styles = alertDialogStyles({ kind, tone })
  const leds = <div aria-hidden="true" className={styles.leds()} />

  if (kind === "drawer") {
    return (
      <Drawer.Portal>
        <Drawer.Backdrop className={styles.backdrop()} />
        <Drawer.Viewport className={styles.viewport()}>
          <Drawer.Popup
            role="alertdialog"
            className={styles.popup({ className })}
          >
            {leds}
            <Drawer.Content>{children}</Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    )
  }

  return (
    <BaseAlertDialog.Portal>
      <BaseAlertDialog.Backdrop className={styles.backdrop()} />
      <BaseAlertDialog.Popup className={styles.popup({ className })}>
        {leds}
        {children}
      </BaseAlertDialog.Popup>
    </BaseAlertDialog.Portal>
  )
}

export function AlertDialogTitle({ children }: { children: ReactNode }) {
  const kind = use(KindContext)
  const Title = kind === "drawer" ? Drawer.Title : BaseAlertDialog.Title

  return (
    <Title className={alertDialogStyles({ kind }).title()}>{children}</Title>
  )
}

export function AlertDialogDescription({ children }: { children: ReactNode }) {
  const kind = use(KindContext)
  const Description =
    kind === "drawer" ? Drawer.Description : BaseAlertDialog.Description

  return (
    <Description className={alertDialogStyles({ kind }).description()}>
      {children}
    </Description>
  )
}

export function AlertDialogActions({ children }: { children: ReactNode }) {
  const kind = use(KindContext)

  return <div className={alertDialogStyles({ kind }).actions()}>{children}</div>
}

type AlertDialogCloseProps = Omit<
  BaseAlertDialog.Close.Props,
  "className" | "style" | "render"
> &
  VariantProps<typeof buttonStyles> & { className?: string }

// Cierra el diálogo al pulsarlo; para confirmar, pásale `variant` y `onClick`.
export function AlertDialogClose({
  variant = "secondary",
  size,
  className,
  ...props
}: AlertDialogCloseProps) {
  const Close =
    use(KindContext) === "drawer" ? Drawer.Close : BaseAlertDialog.Close

  return (
    <Close className={buttonStyles({ variant, size, className })} {...props} />
  )
}
