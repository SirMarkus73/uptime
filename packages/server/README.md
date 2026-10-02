# @uptime/server

API REST de Uptime construida con [NestJS](https://nestjs.com/). Todas las rutas
cuelgan del prefijo `/api`. En producción también sirve el frontend compilado
de [`@uptime/client`](../client/).

## Stack

- **NestJS 12** sobre Express.
- **[Better Auth](https://www.better-auth.com/)** (vía `@thallesp/nestjs-better-auth`)
  con email y contraseña. Sus rutas viven en `/api/auth/*`. Todas las rutas
  requieren sesión salvo las marcadas con `@AllowAnonymous()`.
- **[Drizzle ORM](https://orm.drizzle.team/)** + **Postgres** (`pg`).
- **Zod** para validar la configuración y las peticiones (DTOs con
  `StandardSchemaValidationPipe`).
- **Swagger** para generar el esquema OpenAPI y **[Scalar](https://scalar.com/)**
  para la referencia interactiva.

## Configuración

```bash
cp .env.example .env
```

### Variables de entorno

Se validan al arrancar en [`src/config/configuration.ts`](src/config/configuration.ts).
Si existe un `.env` se carga, sin sobrescribir las variables que ya estén
definidas en el entorno. Si la configuración no es válida el proceso termina
mostrando los errores.

| Variable          | Obligatoria | Por defecto             | Descripción                                                                 |
| ----------------- | ----------- | ----------------------- | --------------------------------------------------------------------------- |
| `NODE_ENV`        | No          | `development`           | `development`, `test` o `production`. Fuera de `production` se regenera el esquema OpenAPI compartido al arrancar. |
| `PORT`            | No          | `3000`                  | Puerto en el que escucha el servidor.                                       |
| `DATABASE_URL`    | Sí          | —                       | Cadena de conexión a Postgres. El valor de `.env.example` coincide con el `compose.yaml` de la raíz. |
| `BETTER_AUTH_URL` | No          | `http://localhost:3000` | Origen público del servidor (solo el origen; Better Auth añade `/api/auth`). |

## Base de datos

Postgres de desarrollo: `docker compose up -d` desde la raíz del repositorio.

- Esquemas: [`src/db/schema/`](src/db/schema/) (`auth-schema.ts`, `monitor-schema.ts`,
  `check-schema.ts`), reunidos en `src/db/schema.ts`.
- Migraciones: [`src/db/migrations/`](src/db/migrations/).

| Script             | Descripción                                             |
| ------------------ | ------------------------------------------------------- |
| `pnpm db:generate` | Genera una migración a partir de los cambios del esquema. |
| `pnpm db:migrate`  | Aplica las migraciones pendientes.                      |
| `pnpm db:push`     | Genera y aplica en un solo paso.                        |
| `pnpm db:studio`   | Abre Drizzle Studio.                                    |

## API

| Método   | Ruta                              | Auth | Descripción                                        |
| -------- | --------------------------------- | ---- | -------------------------------------------------- |
| `GET`    | `/api/health`                     | No   | Health check (`{ "up": true }`).                   |
| `GET`    | `/api/uptime?url=<url>`           | No   | Comprueba al momento si una URL responde.          |
| `GET`    | `/api/monitors`                   | Sí   | Lista los monitores del usuario.                   |
| `POST`   | `/api/monitors`                   | Sí   | Crea un monitor.                                   |
| `GET`    | `/api/monitors/:monitorId`        | Sí   | Detalle de un monitor.                             |
| `POST`   | `/api/monitors/:monitorId/run`    | Sí   | Ejecuta el monitor y guarda la comprobación.       |
| `DELETE` | `/api/monitors/:monitorId`        | Sí   | Elimina un monitor y sus comprobaciones.           |
| `*`      | `/api/auth/*`                     | —    | Rutas de Better Auth (registro, login, sesión…).   |

Documentación con el servidor arrancado:

- Referencia interactiva: <http://localhost:3000/api/reference>
- Esquema OpenAPI: <http://localhost:3000/api/openapi.json>

### Tipos compartidos con el cliente

Cuando `NODE_ENV` no es `production`, al arrancar se convierte el esquema
OpenAPI a TypeScript con `openapi-typescript` y se escribe en
`packages/shared/src/api/api-schema.d.ts`. Después de cambiar un endpoint o un
DTO, arranca el servidor en desarrollo y haz commit del fichero regenerado
(ver [`@uptime/shared`](../shared/)).

## Scripts

| Script             | Descripción                                              |
| ------------------ | -------------------------------------------------------- |
| `pnpm dev`         | Arranca en modo watch (igual que `start:dev`).           |
| `pnpm start`       | Arranca sin watch.                                       |
| `pnpm start:debug` | Arranca en modo watch con el inspector de Node.          |
| `pnpm start:prod`  | Ejecuta la build (`node dist/main`).                     |
| `pnpm build`       | Compila a `dist/`.                                       |
| `pnpm check-types` | Comprueba los tipos con `tsc --noEmit`.                  |
| `pnpm lint`        | Lint con Biome.                                          |

## Tests

Se usa [Vitest](https://vitest.dev/).

```bash
pnpm test          # tests unitarios (*.spec.ts)
pnpm test:watch    # en modo watch
pnpm test:cov      # con cobertura
pnpm test:e2e      # tests e2e (test/*.e2e-spec.ts)
```

- Los tests unitarios no tocan la base de datos; `vitest.config.ts` define una
  `DATABASE_URL` ficticia para que la validación de la configuración no falle.
- Los tests e2e levantan el `AppModule` completo, así que necesitan el `.env` y
  Postgres en marcha.

## Estructura

```
src/
├── main.ts            # Bootstrap: prefijo /api, OpenAPI, Scalar y estáticos del cliente
├── app.module.ts      # Módulo raíz: throttler, auth y módulos de funcionalidad
├── app.controller.ts  # /api/health
├── config/            # Carga y validación de variables de entorno
├── db/                # Conexión Drizzle, esquemas, relaciones y migraciones
├── lib/auth.ts        # Configuración de Better Auth
├── monitors/          # CRUD y ejecución de monitores
├── uptime/            # Comprobación puntual de una URL
└── shared/            # Utilidades comunes (respuestas de error de autenticación)
```
