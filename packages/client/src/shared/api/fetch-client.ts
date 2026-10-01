import type { paths } from "@uptime/shared/api"
import createFetchClient from "openapi-fetch"
import createClient from "openapi-react-query"

export const fetchClient = createFetchClient<paths>()
export const $api = createClient(fetchClient)
