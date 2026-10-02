---
paths:
  - "packages/client/**"
---

# Estructura de las features del frontend

El cliente (`packages/client/src/`) se organiza por funcionalidades ("screaming architecture"): cada feature es una carpeta en `features/<feature>/` (en kebab-case, por ejemplo `uptime-check`) que agrupa todo lo que necesita esa funcionalidad.

## Carpetas de una feature

Crea solo las carpetas que la feature necesite:

```
features/<feature>/
├── api/
│   ├── queries.ts       # helpers `queryOptions` y hooks de lectura (`$api.useQuery`)
│   └── mutations.ts     # hooks de escritura (`$api.useMutation`)
├── components/          # componentes de la feature (<nombre>.tsx)
├── interfaces/          # tipos de la feature (<entidad>.ts)
├── pages/               # componentes de página (<nombre>-page.tsx)
```

### `api/`

- Todas las llamadas a la API pasan por `$api` o `fetchClient` de `#/shared/api/fetch-client`. Nunca uses `fetch` directamente ni declares las rutas a mano.
- Las query keys salen de los helpers `<entidad>QueryOptions` de `queries.ts` (construidos con `queryOptions` de TanStack Query). Reutilízalos en `setQueryData`/`getQueryData`/`invalidateQueries` en lugar de repetir la key.
- Las mutations siguen el patrón optimista de `features/monitors/api/mutations.ts`: `onMutate` crea el toast y modifica la caché (con ids de `#/core/lib/temp-id` si el recurso aún no existe), `onSuccess`/`onError` actualizan el toast y reconcilian o revierten, y `onSettled` invalida.
- No gestiones el `401` en la feature: lo hace el `QueryClient` de `#/core/router.tsx`.

### `interfaces/`

Los tipos que vienen de la API se derivan de `paths` de `@uptime/shared/api`, nunca se reescriben a mano:

```ts
export type MonitorDetail =
  paths["/api/monitors/{monitorId}"]["get"]["responses"]["200"]["content"]["application/json"]
```

### `components/`

- Componentes propios de la feature. El fichero es el nombre del componente en kebab-case (`CreateMonitorForm` → `create-monitor-form.tsx`).
- Para la UI base usa `#/core/design-system/` en lugar de reimplementar botones, inputs, toasts, etc. Si un componente lo necesitan varias features y no depende de ninguna, va a `core/design-system/`, no a una feature.

### `pages/`

- Solo componentes de página: el fichero termina en `-page.tsx` y el componente en `Page` (`pages/login-page.tsx` → `LoginPage`).
- Una página compone componentes (de su feature o de otras) y define el layout de la vista; la lógica va en los componentes y en `api/`.
- Solo las importan las rutas de `src/routes/`, que son envoltorios finos:

```tsx
export const Route = createFileRoute("/login")({ component: RouteComponent })

function RouteComponent() {
  return <LoginPage />
}
```

- Una vista que solo junta piezas de otras features puede ser una feature con únicamente `pages/` (como `features/home/`).

## Dependencias

- Una feature puede importar de `#/core/` y `#/shared/`.
- Entre features, importa siempre con el alias `#/features/<feature>/...`. Dentro de la misma feature también se admiten imports relativos (`../api/mutations`).
- Las páginas pueden componer componentes de otras features (`HomePage` usa `MonitorsSection` y `UptimeCheck`), pero los componentes de una feature no deben importar páginas.
- `core/` y `shared/` no dependen de features. La única excepción actual es `#/features/auth/auth-client`, que también usa `core/layout/header.tsx`.

## Al crear una feature nueva

1. Crea `features/<feature>/` con las carpetas que necesite.
2. Si tiene vista propia, añade `pages/<nombre>-page.tsx` y la ruta en `src/routes/` (el plugin de TanStack Router regenera `routeTree.gen.ts`; no lo edites).
3. Si consume endpoints nuevos, arranca el servidor en desarrollo para regenerar `@uptime/shared/api` antes de escribir `api/` e `interfaces/`.
