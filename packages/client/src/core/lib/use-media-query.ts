import { useSyncExternalStore } from "react"

// Si el componente coincide con la media query (p. ej. "(max-width: 39.99rem)").
// Se actualiza al cambiar el tamaño de la ventana.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mediaQueryList = window.matchMedia(query)
      mediaQueryList.addEventListener("change", onChange)
      return () => mediaQueryList.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
  )
}
