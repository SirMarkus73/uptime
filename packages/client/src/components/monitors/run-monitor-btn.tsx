import { useQueryClient } from "@tanstack/react-query"
import { $api } from "#/lib/fetchClient"

type RunMonitorButtonProps = {
  monitorId: string
}

export function RunMonitorButton({ monitorId }: RunMonitorButtonProps) {
  const listMonitorsQueryKey = $api.queryOptions(
    "get",
    "/api/monitors",
  ).queryKey

  const getMonitorQueryKey = $api.queryOptions(
    "get",
    "/api/monitors/{monitorId}",
    { params: { path: { monitorId } } },
  ).queryKey

  const queryClient = useQueryClient()

  const { mutate, isPending } = $api.useMutation(
    "post",
    "/api/monitors/{monitorId}/run",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getMonitorQueryKey })
        queryClient.invalidateQueries({ queryKey: listMonitorsQueryKey })
      },
    },
  )

  const handleClick = () => {
    mutate({
      params: {
        path: {
          monitorId,
        },
      },
    })
  }

  return (
    <button
      type="button"
      className="shrink-0 rounded-lg border border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-300 transition hover:border-neutral-400 hover:text-neutral-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isPending}
      onClick={handleClick}
    >
      Run
    </button>
  )
}
