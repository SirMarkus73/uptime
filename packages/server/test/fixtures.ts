import { randomUUID } from "node:crypto"
import { getQueueToken } from "@nestjs/bullmq"
import type { INestApplication } from "@nestjs/common"
import { HttpClientModule } from "@nestjs/http-client"
import { Test } from "@nestjs/testing"
import { getOptionsToken } from "@nestjs/throttler"
import type { Queue } from "bullmq"
import { eq } from "drizzle-orm"
import request from "supertest"
import type { App } from "supertest/types.js"
import { test as baseTest } from "vitest"
import { AppModule } from "../src/app.module.js"
import { CONFIG } from "../src/config/configuration.js"
import { db } from "../src/db/index.js"
import { monitor, user } from "../src/db/schema.js"
import type { MonitorDetailDto } from "../src/monitors/dto/monitor.dto.js"
import { MonitorsConsumer } from "../src/monitors/monitors.consumer.js"
import {
  MONITORS_QUEUE,
  monitorSchedulerId,
  type RunMonitorJobData,
} from "../src/monitors/monitors.queue.js"
import { setupApp } from "../src/setup-app.js"

type TestApp = INestApplication<App>
type TestAgent = ReturnType<typeof request.agent>

export type TestUser = {
  id: string
  agent: TestAgent
}

type CreateTestAppOptions = {
  // `fetch` que usa HttpClient para comprobar webs: los tests nunca salen a la red.
  fetch: typeof globalThis.fetch
  // El ThrottlerGuard global (3 peticiones/s) tumbaría cualquier suite con
  // más de tres peticiones seguidas, así que solo se activa donde se testea el 429.
  throttle?: boolean
}

// Levanta la app como `main.ts` (sin bodyParser para Better Auth, prefijo y
// validación global) para recorrer el pipeline HTTP completo.
export async function createTestApp({
  fetch,
  throttle = false,
}: CreateTestAppOptions): Promise<TestApp> {
  let builder = Test.createTestingModule({
    imports: [AppModule, HttpClientModule.forRoot({ fetch })],
  })
    // Sin worker: el scheduler lanza la primera ejecución en cuanto se crea,
    // y añadiría comprobaciones por su cuenta en mitad de los tests.
    .overrideProvider(MonitorsConsumer)
    .useValue({})

  if (!throttle) {
    builder = builder.overrideProvider(getOptionsToken()).useValue({
      throttlers: [{ ttl: 1000, limit: 1 }],
      skipIf: () => true,
    })
  }

  const moduleRef = await builder.compile()
  const app = moduleRef.createNestApplication<TestApp>({ bodyParser: false })
  setupApp(app)
  await app.init()

  return app
}

// Registra un usuario nuevo; el agent guarda la cookie de sesión.
async function signUp(app: TestApp): Promise<TestUser> {
  const agent = request.agent(app.getHttpServer())

  const response = await agent
    .post("/api/auth/sign-up/email")
    .set("Origin", CONFIG.BETTER_AUTH_URL)
    .send({
      name: "E2E",
      email: `e2e-${randomUUID()}@uptime.test`,
      password: "e2e-password",
    })
    .expect(200)

  return { id: response.body.user.id, agent }
}

export function getMonitorsQueue(app: TestApp) {
  return app.get<Queue<RunMonitorJobData>>(getQueueToken(MONITORS_QUEUE))
}

// Borrar el usuario elimina en cascada sus sesiones, monitores y comprobaciones,
// pero no los schedulers de la cola: se quitan antes para no dejarlos huérfanos.
async function deleteUser(app: TestApp, id: string) {
  const queue = getMonitorsQueue(app)
  const monitors = await db
    .select({ id: monitor.id })
    .from(monitor)
    .where(eq(monitor.ownedBy, id))

  await Promise.all(
    monitors.map(({ id }) => queue.removeJobScheduler(monitorSchedulerId(id))),
  )
  await db.delete(user).where(eq(user.id, id))
}

export async function createMonitor(
  owner: TestUser,
  body = { name: "Example", webPage: "https://example.com" },
): Promise<MonitorDetailDto> {
  const response = await owner.agent
    .post("/api/monitors")
    .send(body)
    .expect(201)

  return response.body
}

export const test = baseTest
  .extend("fetch", { scope: "file" }, () =>
    vi.fn<typeof globalThis.fetch>(
      async () => new Response(null, { status: 200 }),
    ),
  )
  .extend("app", { scope: "file" }, async ({ fetch }, { onCleanup }) => {
    const app = await createTestApp({ fetch })
    onCleanup(() => app.close())
    return app
  })
  .extend("monitorsQueue", ({ app }) => getMonitorsQueue(app))
  // Peticiones sin sesión.
  .extend("anonymous", ({ app }) => request(app.getHttpServer()))
  .extend("user", async ({ app }, { onCleanup }) => {
    const testUser = await signUp(app)
    onCleanup(() => deleteUser(app, testUser.id))
    return testUser
  })
  // Segundo usuario para comprobar que no se accede a recursos ajenos.
  .extend("otherUser", async ({ app }, { onCleanup }) => {
    const testUser = await signUp(app)
    onCleanup(() => deleteUser(app, testUser.id))
    return testUser
  })
