import { useQueryClient } from "@tanstack/react-query"
import { toast } from "#/core/design-system/toast"
import { $api } from "#/shared/api/fetch-client"
import type { Monitor } from "../interfaces/monitor"
import { monitorQueryOptions, monitorsQueryOptions } from "./queries"

// El detalle de un monitor solo trae los últimos checks (ver MonitorsService.getMonitor).

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

export function useRunMonitor(monitorId: Monitor["id"]) {
  const queryClient = useQueryClient()

  const { mutate: baseMutate, ...mutation } = $api.useMutation(
    "post",
    "/api/monitors/{monitorId}/run",
    {
      onMutate: async () => {
        const toastId = toast.add({
          title: "Ejecutando monitor",
          type: "loading",
        })

        const queryOptions = monitorQueryOptions(monitorId)
        const data = await queryClient.query(queryOptions)

        toast.update(toastId, {
          title: `Monitor: ${data.name}`,
        })

        return { toastId }
      },

      onSuccess: (ranMonitor, _variables, { toastId }) => {
        // Se actualiza la caché con el check que devuelve el run en vez de
        // volver a pedir la lista y el detalle.

        queryClient.setQueryData(monitorsQueryOptions().queryKey, (monitors) =>
          monitors?.map((monitor) => {
            if (monitor.id !== monitorId) return monitor

            const isUp = ranMonitor.checks[0] ? ranMonitor.checks[0].isUp : null

            return { ...monitor, isUp }
          }),
        )

        queryClient.setQueryData(
          monitorQueryOptions(monitorId).queryKey,
          ranMonitor,
        )

        toast.update(toastId, {
          description: "Monitor ejecutando correctamente",
          type: "success",
        })
      },
      onError: (_error, _variables, result) => {
        if (!result) return
        toast.update(result.toastId, {
          description: "Error al ejecutar el monitor",
          type: "error",
        })
      },
    },
  )

  const mutate = () => {
    baseMutate({ params: { path: { monitorId } } })
  }

  return { ...mutation, mutate }
}
