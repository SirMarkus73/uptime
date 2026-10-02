import { Button as BaseButton } from "@base-ui/react/button"
import { tv, type VariantProps } from "tailwind-variants"

// También se usa para dar aspecto de botón a los <Link> del router.
export const buttonStyles = tv({
  base: "rounded-lg font-medium transition active:scale-95 data-disabled:cursor-not-allowed data-disabled:opacity-60",
  variants: {
    variant: {
      primary: "bg-accent text-neutral-950 hover:bg-accent-hover",
      secondary:
        "border border-neutral-700 text-neutral-300 hover:border-neutral-400 hover:text-neutral-100",
      danger:
        "border border-neutral-800 text-neutral-300 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300",
      // Para confirmar una acción destructiva (p. ej. en un AlertDialog).
      destructive: "bg-red-500 text-neutral-950 hover:bg-red-400",
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

type ButtonProps = Omit<BaseButton.Props, "className"> &
  VariantProps<typeof buttonStyles> & { className?: string }

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  )
}
