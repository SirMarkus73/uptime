import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query"
import { minutesToMs } from "#/core/lib/helpers"
import { $api } from "#/shared/api/fetch-client"
import type { CheckStatsDetail } from "../interfaces/check"
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

export const monitorQueryOptions = (monitorId: MonitorDetail["id"]) =>
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

export const monitorChecksStatsQueryOptions = (
  monitorId: MonitorDetail["id"],
  detail: CheckStatsDetail,
) =>
  queryOptions(
    $api.queryOptions(
      "get",
      "/api/monitors/{monitorId}/checks/stats",
      {
        params: { path: { monitorId }, query: { detail } },
      },
      {
        staleTime: minutesToMs(2),
        retry: (failureCount, error) =>
          !isMonitorNotFoundError(error) && failureCount < MAX_RETRIES,
      },
    ),
  )

// Prefijo de las keys de las estadísticas de un monitor, para invalidar todos
// los periodos a la vez.
export const monitorChecksStatsQueryKey = (monitorId: MonitorDetail["id"]) =>
  $api.queryOptions("get", "/api/monitors/{monitorId}/checks/stats", {
    params: { path: { monitorId } },
  }).queryKey

// Misma key que usa `$api.useInfiniteQuery` en `useMonitorChecks`: el cursor de
// cada página no forma parte de ella.
export const monitorChecksQueryOptions = (monitorId: MonitorDetail["id"]) =>
  $api.queryOptions("get", "/api/monitors/{monitorId}/checks", {
    params: { path: { monitorId } },
  })

export function useMonitors() {
  return $api.useQuery("get", "/api/monitors")
}

export function useMonitor(monitorId: MonitorDetail["id"]) {
  return useQuery(monitorQueryOptions(monitorId))
}

export function useMonitorChecksStats(
  monitorId: MonitorDetail["id"],
  detail: CheckStatsDetail,
) {
  return useQuery({
    ...monitorChecksStatsQueryOptions(monitorId, detail),
    // Al cambiar de periodo se sigue viendo el anterior hasta que llega el nuevo.
    placeholderData: keepPreviousData,
  })
}

export function useMonitorChecks(monitorId: MonitorDetail["id"]) {
  const [method, path, init] = monitorChecksQueryOptions(monitorId).queryKey

  return $api.useInfiniteQuery(method, path, init, {
    pageParamName: "cursor",
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor,
    select: (data) => ({
      ...data,
      pages: data.pages.map((el) => el.data),
    }),
  })
}
