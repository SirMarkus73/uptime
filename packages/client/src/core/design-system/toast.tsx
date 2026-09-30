import {
  Toast,
  type ToastManagerAddOptions,
  type ToastManagerUpdateOptions,
} from "@base-ui/react/toast"
import {
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  type LucideIcon,
  X,
} from "lucide-react"
import type { ReactNode } from "react"
import { tv, type VariantProps } from "tailwind-variants"

const toastStyles = tv({
  slots: {
    viewport:
      "fixed right-4 bottom-4 z-50 w-[calc(100vw-2rem)] sm:right-8 sm:bottom-8 sm:w-90",
    // Apilado, expansión al hacer hover y swipe para cerrar, sacado de la demo de Base UI.
    root: [
      "[--gap:0.75rem] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))]",
      "absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom select-none",
      "rounded-lg border bg-neutral-900 shadow-lg shadow-black/30",
      "h-(--height) data-expanded:h-(--toast-height)",
      "[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]",
      "data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--offset-y)))]",
      "data-starting-style:[transform:translateY(150%)]",
      "data-ending-style:opacity-0 data-limited:opacity-0",
      "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
      "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
      "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
      "data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
      "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
      // Rellena el hueco entre toasts para que el hover no se pierda al expandir.
      "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
      "[transition:transform_0.5s_cubic-bezier(0.22,1,0.36,1),opacity_0.5s,height_0.15s]",
    ],
    content:
      "flex items-start gap-3 overflow-hidden p-4 transition-opacity duration-250 data-behind:opacity-0 data-expanded:opacity-100",
    icon: "mt-0.5 size-4 shrink-0",
    title: "text-sm font-medium transition-colors",
    description: "text-sm text-neutral-400",
    close:
      "-m-1 shrink-0 rounded-md p-1 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-100",
  },
  variants: {
    type: {
      default: { root: "border-neutral-800", title: "text-neutral-100" },
      loading: {
        root: "border-neutral-800",
        title: "text-neutral-100",
        icon: "animate-spin text-neutral-400",
      },
      success: { root: "border-up/30", title: "text-up", icon: "text-up" },
      error: {
        root: "border-down/30",
        title: "text-red-300",
        icon: "text-down",
      },
    },
  },
  defaultVariants: {
    type: "default",
  },
})

export type ToastType = NonNullable<VariantProps<typeof toastStyles>["type"]>

function isToastType(type: string | undefined): type is ToastType {
  return type !== undefined && Object.hasOwn(toastStyles.variants.type, type)
}

// Opciones de Base UI pero con `type` restringido a las variantes que sabemos pintar.
type WithType<T> = Omit<T, "type"> & { type?: ToastType }
type AddOptions = WithType<ToastManagerAddOptions<object>>
type UpdateOptions = WithType<ToastManagerUpdateOptions<object>>

// En `promise` Base UI fija el `type` (loading → success | error), así que no se acepta.
type PromiseState = string | Omit<ToastManagerUpdateOptions<object>, "type">
type PromiseOptions<Value> = {
  loading: PromiseState
  success: PromiseState | ((result: Value) => PromiseState)
  error: PromiseState | ((error: unknown) => PromiseState)
}

const manager = Toast.createToastManager()

// Manager global: permite lanzar toasts desde fuera de componentes
// (p. ej. en el onError de una mutación).
export const toast = {
  add: (options: AddOptions) => manager.add(options),
  update: (id: string, options: UpdateOptions) => manager.update(id, options),
  close: (id?: string) => manager.close(id),
  promise: <Value,>(promise: Promise<Value>, options: PromiseOptions<Value>) =>
    manager.promise(promise, options),
}

const icons: Record<ToastType, LucideIcon | null> = {
  default: null,
  loading: LoaderCircle,
  success: CircleCheck,
  error: CircleAlert,
}

function ToastList() {
  const { toasts } = Toast.useToastManager()

  return toasts.map((t) => {
    const type = isToastType(t.type) ? t.type : "default"
    const styles = toastStyles({ type })
    const Icon = icons[type]

    return (
      <Toast.Root
        key={t.id}
        toast={t}
        aria-busy={type === "loading" || undefined}
        className={styles.root()}
      >
        <Toast.Content className={styles.content()}>
          {Icon && <Icon aria-hidden="true" className={styles.icon()} />}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Toast.Title className={styles.title()} />
            <Toast.Description className={styles.description()} />
          </div>
          <Toast.Close aria-label="Cerrar" className={styles.close()}>
            <X aria-hidden="true" className="size-4" />
          </Toast.Close>
        </Toast.Content>
      </Toast.Root>
    )
  })
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const styles = toastStyles()

  return (
    <Toast.Provider toastManager={manager}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className={styles.viewport()}>
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}
