import { useSyncExternalStore } from "react"

const TICK_MS = 1000

// Un único intervalo compartido: todos los componentes que usan `useNow`
// se actualizan a la vez y el reloj se para cuando nadie lo escucha.
const listeners = new Set<() => void>()
let now = Date.now()
let intervalId: ReturnType<typeof setInterval> | undefined

function subscribe(listener: () => void) {
  listeners.add(listener)

  if (listeners.size === 1) {
    now = Date.now()
    intervalId = setInterval(() => {
      now = Date.now()
      for (const notify of listeners) notify()
    }, TICK_MS)
  }

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) clearInterval(intervalId)
  }
}

function getSnapshot() {
  return now
}

// Marca de tiempo actual que se refresca cada segundo.
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot)
}
