# CLAUDE.md

Este fichero orienta a Claude Code (claude.ai/code) cuando trabaja con el código de este repositorio.

Uptime: aplicación web para comprobar si una URL responde. Cualquiera puede lanzar una comprobación puntual; los usuarios con sesión guardan "monitores" y los ejecutan para registrar el estado, el código HTTP y el tiempo de respuesta. Monorepo con pnpm + Turborepo y tres paquetes: `@uptime/client` (SPA en React), `@uptime/server` (API en NestJS) y `@uptime/shared` (tipos de la API autogenerados).

La documentación, los comentarios del código, los textos de la interfaz y los mensajes de commit están en **español**; mantenlo así.

## Comandos

Desde la raíz salvo que se indique lo contrario. Para un paquete concreto: `pnpm -F @uptime/<paquete> <script>`.

```bash
docker compose up -d                     # Postgres de desarrollo (no se reinicia sola; hay que levantarla a mano)
cp packages/server/.env.example packages/server/.env
pnpm -F @uptime/server db:migrate        # aplicar migraciones
pnpm dev                                 # cliente :3001 + servidor :3000 (el `dev` del cliente lanza server#dev mediante `with`)

pnpm build && pnpm start                 # producción: el servidor sirve también packages/client/dist
pnpm test                                # turbo test (solo el servidor tiene tests)
pnpm turbo check-types                   # tsc --noEmit en cliente y servidor
pnpm check / pnpm check:write            # Biome: lint + formato + orden de imports
```

Tests del servidor (Vitest, con globals activados):

```bash
pnpm -F @uptime/server test                                       # unitarios (*.spec.ts)
pnpm -F @uptime/server test src/monitors/monitors.service.spec.ts # un solo fichero
pnpm -F @uptime/server test -t "nombre del test"                  # por nombre
pnpm -F @uptime/server test:e2e                                   # test/*.e2e-spec.ts — necesita .env y Postgres en marcha
```

Base de datos (Drizzle, scripts del paquete servidor): `db:generate` crea una migración a partir de los cambios del esquema, `db:migrate` la aplica y `db:studio` abre Drizzle Studio.

El lint y el formato son solo con Biome (comillas dobles, sin punto y coma, indentación con espacios). Ignora el script `format` que queda en el servidor y llama a prettier.

Documentación de la API con el servidor arrancado: `http://localhost:3000/api/reference` (Scalar) y `http://localhost:3000/api/openapi.json`.

## Arquitectura

### Flujo de tipos de extremo a extremo (el mecanismo clave entre paquetes)

1. Las tablas de la base de datos del servidor (`packages/server/src/db/schema/*.ts`) generan esquemas Zod con `drizzle-orm/zod` (`createInsertSchema`/`createSelectSchema`, con refinamientos por campo).
2. Los DTOs de `src/<funcionalidad>/dto/` hacen `pick`/`extend` de esos esquemas Zod. Los controladores validan con `@Body({ schema })` / `@Param(nombre, { schema })` (`StandardSchemaValidationPipe` global) y documentan las respuestas con `@ApiOkResponse({ standardSchema })`.
3. Al arrancar con `NODE_ENV !== "production"`, `src/main.ts` construye el documento OpenAPI y lo convierte con `openapi-typescript` en `packages/shared/src/api/api-schema.d.ts`.
4. El cliente importa `paths` de `@uptime/shared/api` y usa `openapi-fetch` + `openapi-react-query` (`$api` en `client/src/shared/api/fetch-client.ts`), así que rutas, parámetros y respuestas se comprueban en tiempo de compilación.

**Después de cambiar un endpoint o un DTO, arranca el servidor en desarrollo para regenerar `api-schema.d.ts` e inclúyelo en el mismo commit.** No lo edites a mano (tampoco `client/src/routeTree.gen.ts`, que regenera el plugin de Vite de TanStack Router o `pnpm -F @uptime/client generate-routes`). `@uptime/shared` no tiene paso de compilación: se consume directamente como TypeScript.

### Servidor (`packages/server`, NestJS 12, ESM)

- ESM con `nodenext`: los imports relativos deben llevar la extensión `.js`.
- Prefijo global `/api`. Better Auth (email y contraseña) mediante `@thallesp/nestjs-better-auth` monta `/api/auth/*`; **todas las rutas requieren sesión salvo las marcadas con `@AllowAnonymous()`**. El usuario se obtiene con `@Session() session: UserSession`. Better Auth necesita `bodyParser: false`.
- `ThrottlerGuard` global (3 peticiones/s y 8 peticiones/min).
- La propiedad de los recursos se comprueba en los controladores: se obtiene el monitor, se compara `ownedBy` con `session.user.id` y, si no coincide, se lanza `NotFoundException`.
- `db` (`src/db/index.ts`) es una instancia de Drizzle a nivel de módulo que los servicios importan directamente, sin inyección. Los tests unitarios la sustituyen con `vi.mock("../db/index.js", ...)` (ver `monitors.service.spec.ts`) y nunca tocan Postgres; `vitest.config.ts` define una `DATABASE_URL` y un `BETTER_AUTH_SECRET` ficticios porque importar el módulo de la base de datos dispara la validación de la configuración.
- Configuración: `src/config/configuration.ts` carga `.env` si existe (sin sobrescribir variables ya definidas), valida con Zod y termina el proceso si falla. Exporta un `CONFIG` congelado.
- Drizzle usa relations v2 (`defineRelationsPart` en cada fichero de esquema, combinadas en `src/db/relations.ts`) y `camelCase.table`. Los ficheros de esquema nuevos deben reexportarse desde `src/db/schema.ts`.
- `MonitorsService` depende de `UptimeService.checkState` para hacer la comprobación HTTP al ejecutar un monitor.
- Si existe `packages/client/dist`, el servidor lo sirve como estáticos y devuelve `index.html` para cualquier `GET` que no sea de la API.

### Cliente (`packages/client`, SPA con React 19 + Vite)

- Arquitectura por funcionalidades ("screaming architecture"): `src/features/<funcionalidad>/{api,components,pages,interfaces}`; los componentes base están en `src/core/design-system/` (Base UI + `tailwind-variants`); los ficheros de `src/routes/` son envoltorios finos que renderizan las páginas de cada funcionalidad.
- Los componentes de página van en `features/<funcionalidad>/pages/<nombre>-page.tsx` y se llaman `<Nombre>Page`; solo los importan las rutas. Cualquier otro componente va en `components/`.
- Los imports internos usan el alias `#/*` → `src/*`.
- La gestión del 401 está centralizada: el `onError` de `QueryCache`/`MutationCache` en `src/core/router.tsx` redirige a `/login`; los componentes no lo gestionan.
- Las mutations (`features/monitors/api/mutations.ts`) siguen un patrón de actualización optimista: `onMutate` crea un toast y modifica la caché de queries (ids temporales con `core/lib/temp-id.ts`), `onSuccess`/`onError` actualizan el toast y reconcilian o revierten, y `onSettled` invalida. Reutiliza los helpers `queryOptions` de `api/queries.ts` para las query keys.
- En desarrollo, Vite redirige `/api` a `:3000` (reescribiendo el `Origin`) para que las cookies funcionen en el mismo origen sin CORS. El cliente de Better Auth usa `window.location.origin` como URL base.

## Convenciones y herramientas

- Conventional Commits validados con commitlint (el asunto puede empezar en mayúscula, p. ej. `feat(monitors): Permitir eliminar monitores`). `pnpm commit` lanza commitizen.
- Husky: `pre-commit` ejecuta `biome check --write` sobre los ficheros en stage (y los vuelve a añadir) y después `turbo test`; `commit-msg` ejecuta commitlint.
- Cada push a `main` lanza semantic-release en la CI (versión, `CHANGELOG.md` y release en GitHub). No cambies versiones ni edites `CHANGELOG.md` a mano.
- Turborepo: el `turbo.json` de la raíz usa una tarea `transit` (ningún paquete la define) para que `test`/`check-types` respeten el orden de dependencias y aun así se ejecuten en paralelo. Según `AGENTS.md`, lee la documentación incluida en `docs/` del paquete `turbo` instalado antes de cambiar la configuración o los comandos de Turborepo.
