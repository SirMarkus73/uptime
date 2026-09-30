import { queryOptions } from "@tanstack/react-query"
import { minutesToMs } from "#/core/lib/helpers"
import { $api } from "#/shared/api/fetch-client"

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
      { staleTime: minutesToMs(2) },
    ),
  )

export function useMonitors() {
  return $api.useQuery("get", "/api/monitors")
}
