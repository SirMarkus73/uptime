import { queryOptions, useQuery } from "@tanstack/react-query"
import { minutesToMs } from "#/core/lib/helpers"
import { $api } from "#/shared/api/fetch-client"
import type { MonitorDetail } from "../interfaces/monitor"

const MAX_RETRIES = 3

// Un id mal formado (400) o que no existe o no es del usuario (404)
// significa lo mismo para quien navega: ese monitor no está.
export function isMonitorNotFoundError(
  error: { statusCode?: number } | null | undefined,
) {
  return error?.statusCode === 404 || error?.statusCode === 400
}

// `queryOptions` de TanStack etiqueta la queryKey con el tipo de los datos,
// así `setQueryData`/`getQueryData` infieren el tipo sin genéricos a mano.
export const monitorsQueryOptions = () =>
  queryOptions($api.queryOptions("get", "/api/monitors"))

export const monitorQueryOptions = (monitorId: string) =>
  queryOptions(
    $api.queryOptions(
      "get",
      "/api/monitors/{monitorId}",
      {
        params: { path: { monitorId } },
      },
      {
        staleTime: minutesToMs(2),
        // Reintentar no va a hacer aparecer un monitor que no existe.
        retry: (failureCount, error) =>
          !isMonitorNotFoundError(error) && failureCount < MAX_RETRIES,
      },
    ),
  )

// Sin `sinceDays`: el servidor devuelve los checks de los últimos 5 días.
export const monitorChecksQueryOptions = (monitorId: string) =>
  queryOptions(
    $api.queryOptions(
      "get",
      "/api/monitors/{monitorId}/checks",
      {
        params: { path: { monitorId } },
      },
      {
        staleTime: minutesToMs(2),
        retry: (failureCount, error) =>
          !isMonitorNotFoundError(error) && failureCount < MAX_RETRIES,
      },
    ),
  )

export function useMonitors() {
  return $api.useQuery("get", "/api/monitors")
}

export function useMonitor(monitorId: MonitorDetail["id"]) {
  return useQuery(monitorQueryOptions(monitorId))
}

export function useMonitorChecks(monitorId: MonitorDetail["id"]) {
  return useQuery(monitorChecksQueryOptions(monitorId))
}
