import { tv, type VariantProps } from "tailwind-variants"

const statusDot = tv({
  slots: {
    base: "relative flex shrink-0",
    ping: "absolute inline-flex size-full animate-ping rounded-full opacity-75",
    dot: "relative inline-flex rounded-full",
  },
  variants: {
    status: {
      up: { ping: "bg-up", dot: "bg-up" },
      down: { ping: "bg-down", dot: "bg-down" },
      neutral: { ping: "bg-neutral-100", dot: "bg-neutral-100" },
      unknown: { dot: "bg-neutral-600" },
    },
    size: {
      sm: { base: "size-2", dot: "size-2" },
      md: { base: "size-2.5", dot: "size-2.5" },
    },
  },
  defaultVariants: {
    size: "md",
  },
})

type StatusDotVariants = VariantProps<typeof statusDot>

interface StatusDotProps extends StatusDotVariants {
  status: NonNullable<StatusDotVariants["status"]>
  className?: string
}

export function StatusDot({ status, size, className }: StatusDotProps) {
  const { base, ping, dot } = statusDot({ status, size })

  return (
    <span className={base({ className })}>
      {status !== "unknown" && <span className={ping()} />}
      <span className={dot()} />
    </span>
  )
}
