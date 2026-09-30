import { tv } from "tailwind-variants"

const skeleton = tv({
  base: "animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900",
})

export function Skeleton({ className }: { className?: string }) {
  return <div className={skeleton({ className })} />
}
