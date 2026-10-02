# Uptime

Aplicación para monitorizar la disponibilidad de páginas web. Cualquiera puede
comprobar al momento si una URL responde, y los usuarios registrados pueden
guardar monitores y ejecutarlos para registrar el estado, el código HTTP y el
tiempo de respuesta de cada comprobación.

## Estructura del monorepo

| Paquete                                | Nombre           | Descripción                                                     |
| -------------------------------------- | ---------------- | --------------------------------------------------------------- |
| [`packages/client`](packages/client/)  | `@uptime/client` | Frontend SPA en React + Vite + TanStack Router/Query.           |
| [`packages/server`](packages/server/)  | `@uptime/server` | API REST en NestJS con Better Auth, Drizzle ORM y Postgres.     |
| [`packages/shared`](packages/shared/)  | `@uptime/shared` | Tipos compartidos (esquema OpenAPI generado por el servidor).   |

Herramientas comunes: [pnpm](https://pnpm.io/) workspaces, [Turborepo](https://turborepo.dev/)
para orquestar las tareas y [Biome](https://biomejs.dev/) para lint y formato.

## Requisitos

- Node.js 24
- pnpm 12 (la versión exacta está fijada en `packageManager` del `package.json`)
- Docker, para levantar Postgres en desarrollo

## Puesta en marcha

```bash
# 1. Instalar dependencias
pnpm install

# 2. Levantar Postgres (solo desarrollo; no se reinicia sola, hay que lanzarla a mano)
docker compose up -d

# 3. Configurar el servidor
cp packages/server/.env.example packages/server/.env

# 4. Aplicar las migraciones
pnpm -F @uptime/server db:migrate

# 5. Arrancar cliente y servidor en modo desarrollo
pnpm dev
```

- Cliente: <http://localhost:3001> (redirige `/api` al servidor mediante el proxy de Vite).
- Servidor: <http://localhost:3000/api>
- Referencia de la API: <http://localhost:3000/api/reference>

Las credenciales de [`compose.yaml`](compose.yaml) son solo para desarrollo; no
las uses en producción.

## Producción

```bash
pnpm build
pnpm start
```

`pnpm build` compila todos los paquetes con Turborepo. Si existe
`packages/client/dist`, el servidor sirve el frontend compilado desde el mismo
proceso y devuelve `index.html` para cualquier ruta `GET` que no sea de la API,
de modo que el router del cliente se encarga de ella.

En producción las variables de entorno deben venir del entorno (ver
[`packages/server/README.md`](packages/server/README.md#variables-de-entorno)).

## Scripts de la raíz

| Script                                     | Descripción                                               |
| ------------------------------------------ | --------------------------------------------------------- |
| `pnpm dev`                                 | Arranca todos los paquetes en modo desarrollo (`turbo dev`). |
| `pnpm build`                               | Compila todos los paquetes (`turbo build`).               |
| `pnpm test`                                | Ejecuta los tests (`turbo test`).                         |
| `pnpm start`                               | Arranca el servidor.                                      |
| `pnpm lint` / `pnpm lint:write`            | Lint con Biome (con `:write` aplica los arreglos).        |
| `pnpm format` / `pnpm format:write`        | Formato con Biome.                                        |
| `pnpm check` / `pnpm check:write`          | Lint + formato + orden de imports con Biome.              |
| `pnpm commit`                              | Asistente de commits (commitizen).                        |
| `pnpm release`                             | Publica una versión con semantic-release (lo hace la CI). |

Para ejecutar un script de un paquete concreto usa el filtro de pnpm, por
ejemplo `pnpm -F @uptime/server db:studio`.

## Contribuir

- Los commits siguen [Conventional Commits](https://www.conventionalcommits.org/)
  y se validan con commitlint. `pnpm commit` ayuda a escribirlos.
- Hooks de [husky](https://typicode.github.io/husky/):
  - `commit-msg`: valida el mensaje con commitlint.
  - `pre-commit`: ejecuta `turbo test`.
- Cada push a `main` lanza [semantic-release](https://semantic-release.gitbook.io/)
  desde [`.github/workflows/release.yml`](.github/workflows/release.yml), que
  calcula la versión, actualiza [`CHANGELOG.md`](CHANGELOG.md) y crea la release
  en GitHub.

## Licencia

MIT
