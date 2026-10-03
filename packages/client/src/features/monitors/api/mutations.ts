import type { MutationFunctionContext } from "@tanstack/react-query"
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

  const mutation = $api.useMutation("post", "/api/monitors", {
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

  return {
    ...mutation,
    mutate: (data: Parameters<typeof mutation.mutate>["0"]["body"]) => {
      return mutation.mutate({
        // Misma normalización que el servidor, para que la actualización optimista
        // muestre la URL tal y como se va a guardar.
        body: {
          ...data,
          webPage: URL.parse(data.webPage)?.href ?? data.webPage,
        },
      })
    },
  }
}

export function useRunMonitor(monitorId: MonitorDetail["id"]) {
  const mutation = $api.useMutation("post", "/api/monitors/{monitorId}/run", {
    onMutate: async (_variables, { client }) => {
      const ranMonitor = client.getQueryData(
        monitorQueryOptions(monitorId).queryKey,
      )

      const ranMonitorMsg = "Ejecutando monitor"
      const toastId = toast.add({
        title: ranMonitor?.name || ranMonitorMsg,
        description: ranMonitor?.name && ranMonitorMsg,
        type: "loading",
      })

      return { toastId, ranMonitor }
    },

    onSuccess: (ranMonitor, _variables, { toastId }, { client }) => {
      // Se actualiza la caché con el check que devuelve el run en vez de
      // volver a pedir la lista y el detalle.

      const monitorsQuery = monitorsQueryOptions()
      const monitorQuery = monitorQueryOptions(monitorId)

      client.setQueryData(monitorsQuery.queryKey, (monitors) =>
        monitors?.map((monitor) => {
          if (monitor.id !== monitorId) return monitor

          const isUp = ranMonitor.checks[0] ? ranMonitor.checks[0].isUp : null

          return { ...monitor, isUp }
        }),
      )

      client.setQueryData(monitorQuery.queryKey, ranMonitor)

      const ranMonitorMsg = "Monitor ejecutando correctamente"
      toast.update(toastId, {
        title: ranMonitor.name || ranMonitorMsg,
        description: ranMonitor.name && ranMonitorMsg,
        type: "success",
      })
    },
    onError: (_error, _variables, onMutateResult) => {
      if (!onMutateResult) return
      const { ranMonitor, toastId } = onMutateResult
      const ranMonitorMsg =
        "Ha ocurrido un error mientras se ejecutaba el monitor"
      toast.update(toastId, {
        title: ranMonitor?.name || ranMonitorMsg,
        description: ranMonitor?.name && ranMonitorMsg,
        type: "error",
      })
    },
  })

  return {
    ...mutation,
    mutate: () => {
      mutation.mutate({ params: { path: { monitorId } } })
    },
  }
}

export function useDeleteMonitor(monitorId: MonitorDetail["id"]) {
  const queryKey = monitorsQueryOptions().queryKey

  const mutation = $api.useMutation("delete", "/api/monitors/{monitorId}", {
    onMutate: (_variables, { client }) => {
      const monitors = client.getQueryData(queryKey)
      const deleteCandidateIndex =
        monitors?.findIndex((monitor) => monitor.id === monitorId) ?? -1
      const deleteCandidate = monitors?.[deleteCandidateIndex]

      const toastId = toast.add({
        type: "loading",
        title: deleteCandidate ? deleteCandidate.name : "Eliminando monitor",
      })

      if (!deleteCandidate) return { toastId }

      client.cancelQueries({ queryKey })
      client.setQueryData(queryKey, (oldMonitors) =>
        oldMonitors?.filter((oldMonitor) => oldMonitor.id !== monitorId),
      )

      return { deleteCandidate, deleteCandidateIndex, toastId }
    },
    onError: (_error, _variables, onMutateResult, { client }) => {
      if (!onMutateResult) return

      const { deleteCandidate, deleteCandidateIndex, toastId } = onMutateResult

      const errorMessage = "Error al eliminar el monitor"
      toast.update(toastId, {
        title: !deleteCandidate && errorMessage,
        description: deleteCandidate && errorMessage,
        type: "error",
      })

      if (!deleteCandidate || !deleteCandidateIndex) return

      client.setQueryData(queryKey, (oldMonitors) => {
        if (!oldMonitors) return [deleteCandidate]
        if (oldMonitors.some((monitor) => monitor.id === deleteCandidate.id))
          return oldMonitors

        return [
          ...oldMonitors.slice(0, deleteCandidateIndex),
          deleteCandidate,
          ...oldMonitors.slice(deleteCandidateIndex),
        ]
      })
    },

    onSuccess(_data, _variables, { toastId, deleteCandidate }) {
      const successMessage = "Monitor eliminado correctamente"
      toast.update(toastId, {
        title: !deleteCandidate && successMessage,
        description: deleteCandidate && successMessage,
        type: "success",
      })
    },

    onSettled: (_data, _error, _variables, _mutateResult, { client }) => {
      client.invalidateQueries({ queryKey })
    },
  })

  return {
    ...mutation,
    mutate: () => {
      mutation.mutate({ params: { path: { monitorId } } })
    },
  }
}

// Activar y desactivar el scheduler comparten callbacks: solo cambian el
// valor optimista de `hasScheduler` y los textos del toast.
function monitorSchedulerMutationOptions(
  monitorId: MonitorDetail["id"],
  hasScheduler: boolean,
) {
  const queryKey = monitorQueryOptions(monitorId).queryKey
  const messages = hasScheduler
    ? {
        loading: "Activando las comprobaciones automáticas…",
        success: "Comprobaciones automáticas activadas",
        error: "Error al activar las comprobaciones automáticas",
      }
    : {
        loading: "Pausando las comprobaciones automáticas…",
        success: "Comprobaciones automáticas pausadas",
        error: "Error al pausar las comprobaciones automáticas",
      }

  return {
    onMutate: (_variables: unknown, { client }: MutationFunctionContext) => {
      const previousMonitor = client.getQueryData(queryKey)

      const toastId = toast.add({
        title: previousMonitor?.name || messages.loading,
        description: previousMonitor?.name && messages.loading,
        type: "loading",
      })

      client.cancelQueries({ queryKey })
      client.setQueryData(queryKey, (oldMonitor) =>
        oldMonitor ? { ...oldMonitor, hasScheduler } : oldMonitor,
      )

      return { toastId, previousMonitor }
    },
    onSuccess: (
      _data: unknown,
      _variables: unknown,
      {
        toastId,
        previousMonitor,
      }: { toastId: string; previousMonitor?: MonitorDetail },
    ) => {
      toast.update(toastId, {
        title: previousMonitor?.name || messages.success,
        description: previousMonitor?.name && messages.success,
        type: "success",
      })
    },
    onError: (
      _error: unknown,
      _variables: unknown,
      onMutateResult:
        | { toastId: string; previousMonitor?: MonitorDetail }
        | undefined,
      { client }: MutationFunctionContext,
    ) => {
      if (!onMutateResult) return
      const { toastId, previousMonitor } = onMutateResult

      toast.update(toastId, {
        title: previousMonitor?.name || messages.error,
        description: previousMonitor?.name && messages.error,
        type: "error",
      })

      if (previousMonitor) client.setQueryData(queryKey, previousMonitor)
    },
    onSettled: (
      _data: unknown,
      _error: unknown,
      _variables: unknown,
      _onMutateResult: unknown,
      { client }: MutationFunctionContext,
    ) => {
      client.invalidateQueries({ queryKey })
    },
  }
}

export function useToggleMonitorScheduler(monitorId: MonitorDetail["id"]) {
  const activation = $api.useMutation(
    "post",
    "/api/monitors/{monitorId}/scheduler",
    monitorSchedulerMutationOptions(monitorId, true),
  )
  const deactivation = $api.useMutation(
    "delete",
    "/api/monitors/{monitorId}/scheduler",
    monitorSchedulerMutationOptions(monitorId, false),
  )

  return {
    isPending: activation.isPending || deactivation.isPending,
    toggle: (hasScheduler: MonitorDetail["hasScheduler"]) => {
      const mutation = hasScheduler ? deactivation : activation
      mutation.mutate({ params: { path: { monitorId } } })
    },
  }
}
