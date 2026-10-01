import type { paths } from "@uptime/shared/api"

export type Monitor = Omit<
  paths["/api/monitors/{monitorId}"]["get"]["responses"]["200"]["content"]["application/json"],
  "checks"
>
