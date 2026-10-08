import type { ReactNode } from "react"
import { tv, type VariantProps } from "tailwind-variants"

const alertVariants = tv({
  slots: {
    root: [
      "relative flex items-start gap-3 overflow-hidden rounded-lg border py-3 pr-4 pl-5 text-sm",
      "shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)]",
      // Entrada suave al montarse; se desactiva si el usuario prefiere menos movimiento.
      "transition-[opacity,translate] duration-300 ease-out starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none",
    ],
    // Franja de LEDs a la izquierda que marca el tono, como en `AlertDialog`.
    leds: "bg-leds absolute inset-y-0 left-0 w-1.5",
    panel:
      "grid size-7 shrink-0 place-items-center rounded-md bg-neutral-950/60 ring-1",
    matrix: "size-5",
    body: "min-w-0 flex-1 space-y-1 pt-1 leading-relaxed",
    title: "font-dot text-base leading-none font-bold tracking-tight",
    content: "",
  },
  variants: {
    variant: {
      alert: {
        root: "border-down/25 bg-linear-to-r from-down/15 via-down/8 to-down/5",
        leds: "text-down/60",
        panel: "ring-down/30",
        matrix: "text-red-400",
        title: "text-red-200",
        content: "text-red-300/90",
      },
      ghost: {
        root: "border-neutral-800 bg-neutral-900/60",
        leds: "text-neutral-700",
        panel: "ring-neutral-800",
        matrix: "text-neutral-400",
        title: "text-neutral-200",
        content: "text-neutral-400",
      },
    },
  },
  defaultVariants: { variant: "alert" },
})

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>

// Glifos de 5×5 LEDs: `#` encendido, `.` apagado.
const glyphs: Record<AlertVariant, string[]> = {
  alert: ["..#..", "..#..", "..#..", ".....", "..#.."],
  ghost: ["..#..", ".....", ".##..", "..#..", ".###."],
}

function DotMatrix({
  glyph,
  className,
}: {
  glyph: string[]
  className?: string
}) {
  return (
    <svg viewBox="0 0 5 5" aria-hidden className={className}>
      {glyph.flatMap((row, y) =>
        [...row].map((cell, x) => {
          const lit = cell === "#"
          return (
            <circle
              // biome-ignore lint/suspicious/noArrayIndexKey: la rejilla es fija
              key={`${x}-${y}`}
              cx={x + 0.5}
              cy={y + 0.5}
              r={0.34}
              fill="currentColor"
              opacity={lit ? 1 : 0.15}
              // Halo de LED solo en los puntos encendidos.
              style={
                lit
                  ? { filter: "drop-shadow(0 0 0.4px currentColor)" }
                  : undefined
              }
            />
          )
        }),
      )}
    </svg>
  )
}

type AlertProps = {
  className?: string
  title?: ReactNode
  children: ReactNode
} & VariantProps<typeof alertVariants>

export function Alert({
  children,
  className,
  title,
  variant = "alert",
}: AlertProps) {
  const styles = alertVariants({ variant })

  return (
    // Solo los errores interrumpen al lector de pantalla; el resto se anuncia con cortesía.
    <div
      role={variant === "alert" ? "alert" : "status"}
      className={styles.root({ className })}
    >
      <span aria-hidden className={styles.leds()} />
      <span className={styles.panel()}>
        <DotMatrix glyph={glyphs[variant]} className={styles.matrix()} />
      </span>
      <div className={styles.body()}>
        {title && <p className={styles.title()}>{title}</p>}
        <div className={styles.content()}>{children}</div>
      </div>
    </div>
  )
}
