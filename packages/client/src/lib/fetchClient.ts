import createFetchClient from "openapi-fetch"
import createClient from "openapi-react-query"
import type { paths } from "./api-schema"

export const fetchClient = createFetchClient<paths>()
export const $api = createClient(fetchClient)
