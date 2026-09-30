import { useQueryClient } from "@tanstack/react-query"
import { $api } from "#/shared/api/fetch-client"
import { monitorQueryOptions, monitorsQueryOptions } from "./queries"

export function useCreateMonitor() {
  const queryClient = useQueryClient()

  return $api.useMutation("post", "/api/monitors", {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: monitorsQueryOptions().queryKey,
      })
    },
  })
}

export function useRunMonitor() {
  const queryClient = useQueryClient()

  return $api.useMutation("post", "/api/monitors/{monitorId}/run", {
    onSuccess: (_data, { params }) => {
      queryClient.invalidateQueries({
        queryKey: monitorQueryOptions(params.path.monitorId).queryKey,
      })
      queryClient.invalidateQueries({
        queryKey: monitorsQueryOptions().queryKey,
      })
    },
  })
}
