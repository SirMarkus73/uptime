import type { ReactNode } from "react"
import { tv } from "tailwind-variants"

const alert = tv({
  base: "rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300",
})

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className={alert()}>
      {children}
    </div>
  )
}
