import type { paths } from "@uptime/shared/api"

export type MonitorDetail =
  paths["/api/monitors/{monitorId}"]["get"]["responses"]["200"]["content"]["application/json"]
export type MonitorList =
  paths["/api/monitors"]["get"]["responses"]["200"]["content"]["application/json"]
export type MonitorListItem = MonitorList[number]
export type MonitorCheck = MonitorDetail["checks"][number]
