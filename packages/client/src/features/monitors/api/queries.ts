import { $api } from "#/shared/api/fetch-client"

export const monitorsQueryOptions = () =>
  $api.queryOptions("get", "/api/monitors")

export const monitorQueryOptions = (monitorId: string) =>
  $api.queryOptions("get", "/api/monitors/{monitorId}", {
    params: { path: { monitorId } },
  })

export function useMonitors() {
  return $api.useQuery("get", "/api/monitors")
}
