import { LoaderCircle } from "lucide-react"
import { tv, type VariantProps } from "tailwind-variants"

const spinner = tv({
  base: "shrink-0 animate-spin text-neutral-400",
  variants: {
    size: {
      sm: "size-3",
      md: "size-4",
    },
  },
  defaultVariants: {
    size: "md",
  },
})

interface SpinnerProps extends VariantProps<typeof spinner> {
  label?: string
  className?: string
}

export function Spinner({ size, label = "Cargando", className }: SpinnerProps) {
  return (
    <LoaderCircle
      role="status"
      aria-label={label}
      className={spinner({ size, className })}
    />
  )
}
