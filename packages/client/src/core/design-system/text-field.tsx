import type { ComponentProps } from "react"
import { tv } from "tailwind-variants"

const textField = tv({
  slots: {
    label:
      "flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500",
    input:
      "rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm font-normal normal-case tracking-normal text-neutral-100 placeholder:text-neutral-600 outline-none transition-colors focus:border-neutral-400",
  },
})

interface TextFieldProps extends ComponentProps<"input"> {
  label: string
  name: string
}

export function TextField({
  label,
  name,
  className,
  ...props
}: TextFieldProps) {
  const styles = textField()

  return (
    <label className={styles.label()}>
      {label}
      <input
        id={name}
        name={name}
        className={styles.input({ className })}
        {...props}
      />
    </label>
  )
}
