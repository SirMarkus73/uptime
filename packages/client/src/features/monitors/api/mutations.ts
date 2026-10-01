import { toast } from "#/core/design-system/toast"
import { createTempId } from "#/core/lib/temp-id"
import { authClient } from "#/features/auth/auth-client"
import { $api } from "#/shared/api/fetch-client"
import type { MonitorDetail, MonitorListItem } from "../interfaces/monitor"
import { monitorQueryOptions, monitorsQueryOptions } from "./queries"

// El detalle de un monitor solo trae los últimos checks (ver MonitorsService.getMonitor).

export function useCreateMonitor() {
  const { data: session } = authClient.useSession()

  const user = session?.user

  return $api.useMutation("post", "/api/monitors", {
    // El id del toast viaja como resultado de onMutate, así cada petición
    // actualiza su propio toast aunque dos monitores se llamen igual.

    onMutate: ({ body }, { client }) => {
      const toastId = toast.add({
        title: body.name,
        description: "Creando monitor…",
        type: "loading",
      })

      if (!user) return { toastId }

      const createdMonitorTempId = createTempId(crypto.randomUUID())

      const createdMonitor: MonitorListItem = {
        id: createdMonitorTempId,
        createdAt: new Date().toISOString(),
        isUp: null,
        name: body.name,
        ownedBy: user.id,
        webPage: body.webPage,
      }

      const queryKey = monitorsQueryOptions().queryKey

      client.cancelQueries({ queryKey })
      client.setQueryData(queryKey, (oldMonitors) =>
        oldMonitors ? [createdMonitor, ...oldMonitors] : [createdMonitor],
      )

      return { toastId, createdMonitorTempId }
    },
    onSuccess: (
      data,
      _params,
      { toastId, createdMonitorTempId },
      { client },
    ) => {
      toast.update(toastId, {
        description: "Monitor creado de forma correcta",
        type: "success",
      })

      if (createdMonitorTempId) {
        const queryKey = monitorsQueryOptions().queryKey

        client.setQueryData(queryKey, (oldMonitors) =>
          oldMonitors?.map((oldMonitor) => {
            if (oldMonitor.id !== createdMonitorTempId) return oldMonitor
            const newMonitor: MonitorListItem = {
              createdAt: data.createdAt,
              id: data.id,
              isUp: null,
              name: data.name,
              ownedBy: data.ownedBy,
              webPage: data.webPage,
            }

            return newMonitor
          }),
        )
      }
    },
    onError: (_error, _params, onMutateResult, { client }) => {
      if (!onMutateResult) return
      const { createdMonitorTempId, toastId } = onMutateResult

      toast.update(toastId, {
        description: "Error al crear el monitor",
        type: "error",
        priority: "high",
      })

      if (createdMonitorTempId) {
        const queryKey = monitorsQueryOptions().queryKey

        client.setQueryData(queryKey, (oldMonitors) =>
          oldMonitors?.filter(
            (oldMonitor) => oldMonitor.id !== createdMonitorTempId,
          ),
        )
      }
    },
    onSettled: (_data, _error, _variables, _onMutateResult, { client }) => {
      client.invalidateQueries({
        queryKey: monitorsQueryOptions().queryKey,
      })
    },
  })
}

export function useRunMonitor(monitorId: MonitorDetail["id"]) {
  const { mutate: baseMutate, ...mutation } = $api.useMutation(
    "post",
    "/api/monitors/{monitorId}/run",
    {
      onMutate: async (_variables, { client }) => {
        const toastId = toast.add({
          title: "Ejecutando monitor",
          type: "loading",
        })

        const queryOptions = monitorQueryOptions(monitorId)
        const data = await client.query(queryOptions)

        toast.update(toastId, {
          title: `Monitor: ${data.name}`,
        })

        return { toastId }
      },

      onSuccess: (ranMonitor, _variables, { toastId }, { client }) => {
        // Se actualiza la caché con el check que devuelve el run en vez de
        // volver a pedir la lista y el detalle.

        client.setQueryData(monitorsQueryOptions().queryKey, (monitors) =>
          monitors?.map((monitor) => {
            if (monitor.id !== monitorId) return monitor

            const isUp = ranMonitor.checks[0] ? ranMonitor.checks[0].isUp : null

            return { ...monitor, isUp }
          }),
        )

        client.setQueryData(monitorQueryOptions(monitorId).queryKey, ranMonitor)

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
