import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"

type SegmentedControlOption<T extends string> = {
  value: T
  label: string
}

type SegmentedControlProps<T extends string> = {
  value: T
  onValueChange: (value: T) => void
  options: readonly SegmentedControlOption<T>[]
  "aria-label": string
}

// Grupo de botones en el que siempre hay exactamente uno pulsado.
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  ...props
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup
      value={[value]}
      // Pulsar el botón activo lo soltaría y dejaría el grupo vacío; se ignora.
      onValueChange={([next]) => {
        if (next) onValueChange(next as T)
      }}
      className="inline-flex gap-0.5 rounded-lg border border-neutral-800 bg-neutral-900 p-0.5"
      {...props}
    >
      {options.map((option) => (
        <Toggle
          key={option.value}
          value={option.value}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-200 data-pressed:bg-neutral-800 data-pressed:text-neutral-100"
        >
          {option.label}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}
