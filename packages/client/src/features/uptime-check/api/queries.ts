import { $api } from "#/shared/api/fetch-client"

export function useUptimeCheck(url: string) {
  return $api.useQuery(
    "get",
    "/api/uptime",
    { params: { query: { url } } },
    { enabled: url.length > 0 },
  )
}
