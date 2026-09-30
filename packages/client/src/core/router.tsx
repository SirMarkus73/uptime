import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { routeTree } from "#/routeTree.gen"
import { isUnauthorizedError } from "#/shared/api/errors"

export function getRouter() {
  // Cualquier petición que devuelva 401 (sesión caducada o inexistente)
  // manda al login, en lugar de gestionarlo en cada componente.
  const redirectIfUnauthorized = (error: unknown) => {
    if (isUnauthorizedError(error)) {
      router.navigate({ to: "/login" })
    }
  }

  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: redirectIfUnauthorized }),
    mutationCache: new MutationCache({ onError: redirectIfUnauthorized }),
  })

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
