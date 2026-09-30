import { useQueryClient } from "@tanstack/react-query"
import { toast } from "#/core/design-system/toast"
import { $api } from "#/shared/api/fetch-client"
import { monitorQueryOptions, monitorsQueryOptions } from "./queries"

export function useCreateMonitor() {
  const queryClient = useQueryClient()

  return $api.useMutation("post", "/api/monitors", {
    // El id del toast viaja como resultado de onMutate, así cada petición
    // actualiza su propio toast aunque dos monitores se llamen igual.
    onMutate: ({ body }) => ({
      toastId: toast.add({
        title: body.name,
        description: "Creando monitor…",
        type: "loading",
      }),
    }),
    onSuccess: async (_data, _params, { toastId }) => {
      await queryClient.invalidateQueries({
        queryKey: monitorsQueryOptions().queryKey,
      })

      toast.update(toastId, {
        description: "Monitor creado de forma correcta",
        type: "success",
      })
    },
    onError: (_error, _params, result) => {
      if (!result) return
      toast.update(result.toastId, {
        description: "Error al crear el monitor",
        type: "error",
        priority: "high",
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
