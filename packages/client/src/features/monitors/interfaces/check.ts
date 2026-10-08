import type { paths } from "@uptime/shared/api"

export type CheckListResponse =
  paths["/api/monitors/{monitorId}/checks"]["get"]["responses"]["200"]["content"]["application/json"]

export type CheckList = CheckListResponse["data"]
export type CheckListItem = CheckList[number]
export type CheckListMeta = CheckListResponse["meta"]

export type CheckStatsList =
  paths["/api/monitors/{monitorId}/checks/stats"]["get"]["responses"]["200"]["content"]["application/json"]
export type CheckStat = CheckStatsList[number]
