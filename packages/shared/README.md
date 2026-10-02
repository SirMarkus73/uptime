# @uptime/shared

Paquete interno con los tipos compartidos entre el cliente y el servidor.

## Exports

| Import                | Fichero                  | Contenido                                       |
| --------------------- | ------------------------ | ----------------------------------------------- |
| `@uptime/shared/api`  | `src/api/api-schema.d.ts`  | Tipos de la API (`paths`, `components`, …) generados a partir del esquema OpenAPI. |

## `api-schema.d.ts` es autogenerado

**No lo edites a mano.** El servidor lo regenera con
[`openapi-typescript`](https://openapi-ts.dev/) cada vez que arranca con
`NODE_ENV` distinto de `production` (ver `packages/server/src/main.ts`).

Para actualizarlo después de cambiar un endpoint o un DTO basta con arrancar el
servidor en desarrollo:

```bash
pnpm -F @uptime/server dev
```

Incluye el fichero regenerado en el mismo commit que el cambio de la API.

## Uso

El paquete no necesita compilación: se consume directamente el TypeScript desde
otros paquetes del workspace.

```jsonc
// package.json
"dependencies": {
  "@uptime/shared": "workspace:*"
}
```

```ts
import type { paths } from "@uptime/shared/api"
import createFetchClient from "openapi-fetch"

export const fetchClient = createFetchClient<paths>()
```
