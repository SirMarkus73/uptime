# Testing

## Usa siempre la skill `vitest`

Siempre que la tarea tenga que ver con testing (escribir, revisar, depurar o ejecutar tests, mocks, fixtures, cobertura o configuración de Vitest), **invoca primero la skill `/vitest`** con la herramienta Skill y sigue sus indicaciones, antes de leer o editar ningún test. Los tests del proyecto usan Vitest.

## Todo dominio del backend DEBE tener tests de todas sus respuestas

Cada dominio de `packages/server/src/` (cada carpeta de funcionalidad con su módulo, como `monitors/` o `uptime/`) **DEBE** tener tests, y esos tests **DEBEN** comprobar **todas** las respuestas que puede devolver cada uno de sus endpoints: tanto las de éxito como las de error.

- No basta con el caso feliz. Cada código posible de cada endpoint necesita al menos un test: `200`, `201` o `204` según el caso, `400` si hay validación, `401` si la ruta requiere sesión, `403` si hay permisos, `404` si el recurso no existe o no pertenece al usuario, `409` si hay conflictos, etc.
- La lista de respuestas de un endpoint es la que documentan sus decoradores de Swagger (`@ApiOkResponse`, `@ApiCreatedResponse`, `@ApiNoContentResponse`, `@ApiAuthenticationErrors()`…) más las excepciones que lanzan el controlador y el servicio. Si un endpoint devuelve un código que no está documentado, documéntalo; si está documentado pero no se testea, añade el test.
- En este proyecto, acceder a un recurso de otro usuario devuelve `404` (no `403`). Testea ese caso de forma explícita en cada endpoint que compruebe la propiedad.
- Al añadir un endpoint nuevo o un nuevo código de respuesta, sus tests van en el mismo cambio.

### Dónde se testea cada respuesta

- **Tests unitarios** (`*.spec.ts` junto al código, `pnpm -F @uptime/server test`): `<dominio>.controller.spec.ts` y `<dominio>.service.spec.ts`. Cubren las respuestas que dependen de la lógica del controlador o del servicio: los resultados de éxito y las excepciones que lanzan (`NotFoundException`, `InternalServerErrorException`…). El servicio de base de datos se mockea con `vi.mock("../db/index.js", ...)`; nunca se toca Postgres.
- **Tests e2e** (`test/*.e2e-spec.ts`, `pnpm -F @uptime/server test:e2e`): las respuestas que producen los pipes, guards y el resto del pipeline HTTP, que los tests unitarios no pueden ver al llamar al método del controlador directamente. Esto incluye `400` (validación con `StandardSchemaValidationPipe`), `401` (sesión de Better Auth) y el código de estado final (por ejemplo, el `204` de `@HttpCode`). Necesitan `.env` y Postgres en marcha.
