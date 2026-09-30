import type { ComponentProps } from "react"
import { tv, type VariantProps } from "tailwind-variants"

// También se usa para dar aspecto de botón a los <Link> del router.
export const buttonStyles = tv({
  base: "rounded-lg font-medium transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
  variants: {
    variant: {
      primary: "bg-accent text-neutral-950 hover:bg-accent-hover",
      secondary:
        "border border-neutral-700 text-neutral-300 hover:border-neutral-400 hover:text-neutral-100",
      danger:
        "border border-neutral-800 text-neutral-300 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300",
    },
    size: {
      md: "px-4 py-2",
      sm: "px-3 py-1.5 text-sm",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
})

type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonStyles>

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  )
}
