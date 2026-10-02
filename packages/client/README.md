# @uptime/client

Frontend de Uptime: una SPA en React que consume la API de
[`@uptime/server`](../server/).

## Stack

- **React 19** + **Vite 8** (SPA, sin SSR).
- **[TanStack Router](https://tanstack.com/router)** con rutas basadas en ficheros.
- **[TanStack Query](https://tanstack.com/query)** con
  [`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/) y
  [`openapi-react-query`](https://openapi-ts.dev/openapi-react-query/), tipados con
  el esquema de [`@uptime/shared/api`](../shared/).
- **[Better Auth](https://www.better-auth.com/)** (cliente React) para registro e
  inicio de sesión.
- **[Tailwind CSS 4](https://tailwindcss.com/)** + `tailwind-variants` y
  `tailwind-merge`, componentes de [Base UI](https://base-ui.com/) e iconos de
  [Lucide](https://lucide.dev/).

## Desarrollo

```bash
pnpm dev
```

Arranca Vite en <http://localhost:3001>. Gracias a la opción `with` de
[`turbo.json`](turbo.json), lanzarlo con Turborepo (`pnpm dev` aquí o en la
raíz) arranca también el servidor.

Vite redirige las peticiones a `/api` hacia `http://localhost:3000`
(ver [`vite.config.ts`](vite.config.ts)), así que cliente y API comparten origen
y las cookies de sesión funcionan sin configurar CORS.

## Scripts

| Script                 | Descripción                                             |
| ---------------------- | ------------------------------------------------------- |
| `pnpm dev`             | Servidor de desarrollo en el puerto 3001.               |
| `pnpm build`           | Compila a `dist/` (lo sirve el servidor en producción). |
| `pnpm preview`         | Previsualiza la build.                                  |
| `pnpm generate-routes` | Regenera `src/routeTree.gen.ts` sin arrancar Vite.      |
| `pnpm check-types`     | Comprueba los tipos con `tsc --noEmit`.                 |

## Estructura

```
src/
├── main.tsx               # Punto de entrada
├── styles.css             # Tailwind y estilos globales
├── routes/                # Rutas (file-based routing)
├── routeTree.gen.ts       # Árbol de rutas autogenerado, no editar
├── core/
│   ├── design-system/     # Componentes base (button, text-field, toast…)
│   ├── layout/            # Cabecera y layout común
│   ├── lib/               # Helpers
│   └── router.tsx         # Creación del router y del QueryClient
├── features/
│   ├── auth/              # Cliente de Better Auth, login y registro
│   ├── home/              # Página principal
│   ├── monitors/          # Listado, creación, ejecución y borrado de monitores
│   └── uptime-check/      # Comprobación puntual de una URL
└── shared/api/            # Cliente HTTP tipado y gestión de errores
```

Los imports internos usan el alias `#/*` → `src/*` (definido en `imports` del
`package.json`), por ejemplo `import { Button } from "#/core/design-system/button"`.

Las funcionalidades se organizan por carpeta dentro de `features/`, cada una
con sus `api/` (queries y mutations), `components/` y `pages/`.

## Rutas

| Ruta        | Página                                              |
| ----------- | --------------------------------------------------- |
| `/`         | Comprobación de URLs y, con sesión, los monitores.  |
| `/login`    | Inicio de sesión.                                   |
| `/register` | Registro.                                           |

- Para añadir una ruta crea un fichero en `src/routes/`; el plugin de TanStack
  Router actualiza `routeTree.gen.ts` automáticamente.
- El layout común está en `src/routes/__root.tsx`: lo que se añada ahí aparece
  en todas las rutas.
- Para navegar usa el componente `Link` de `@tanstack/react-router`.

## Llamadas a la API

[`src/shared/api/fetch-client.ts`](src/shared/api/fetch-client.ts) exporta
`fetchClient` (openapi-fetch) y `$api` (hooks de TanStack Query). Ambos están
tipados con `paths` de `@uptime/shared/api`, de modo que rutas, parámetros y
respuestas se comprueban en tiempo de compilación.

```tsx
const { data } = $api.useQuery("get", "/api/monitors")
```

Cualquier query o mutation que devuelva `401` redirige a `/login`; está
centralizado en el `QueryClient` de [`src/core/router.tsx`](src/core/router.tsx),
así que los componentes no tienen que gestionarlo.

Si cambia la API, arranca el servidor en desarrollo para regenerar los tipos.
