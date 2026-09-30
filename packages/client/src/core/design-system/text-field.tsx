import { Field } from "@base-ui/react/field"
import { tv } from "tailwind-variants"

const textField = tv({
  slots: {
    root: "flex flex-col gap-1.5",
    label: "text-xs font-medium uppercase tracking-wider text-neutral-500",
    input:
      "rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none transition-colors focus:border-neutral-400 data-invalid:border-red-500/60",
    error: "text-xs text-red-300",
  },
})

interface TextFieldProps extends Omit<Field.Control.Props, "className"> {
  label: string
  name: string
  className?: string
}

export function TextField({
  label,
  name,
  className,
  ...props
}: TextFieldProps) {
  const styles = textField()

  return (
    <Field.Root name={name} className={styles.root()}>
      <Field.Label className={styles.label()}>{label}</Field.Label>
      <Field.Control className={styles.input({ className })} {...props} />
      <Field.Error className={styles.error()} />
    </Field.Root>
  )
}
