import { Skeleton } from "#/core/design-system/skeleton"

// Misma silueta que MonitorOverview + MonitorResponseTimeChart + MonitorCheckHistory para que no salte el layout.
export function MonitorDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando monitor"
      className="flex flex-col gap-12"
    >
      <div className="flex flex-col gap-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-4 w-64 max-w-full rounded-md" />
          </div>
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>

        <div>
          {/* El rótulo de estado, con los LEDs aún apagados */}
          <div className="bg-leds h-15 w-72 max-w-full text-neutral-800 motion-safe:animate-pulse sm:h-24 sm:w-md" />
          <Skeleton className="mt-5 h-5 w-80 max-w-full rounded-md" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40 rounded-md" />
        <Skeleton className="h-56" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-48 rounded-md" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}
