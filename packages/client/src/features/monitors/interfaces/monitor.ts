import type { paths } from "#/shared/api/api-schema"

export type Monitor = Omit<
  paths["/api/monitors/{monitorId}"]["get"]["responses"]["200"]["content"]["application/json"],
  "checks"
>
