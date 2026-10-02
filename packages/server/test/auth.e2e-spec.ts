import { test } from "./fixtures.js"

// Better Auth rechaza con 403 las peticiones cuyo Origin no es de confianza
// (protección CSRF). Se usan credenciales inexistentes: el 401 indica que la
// petición ha superado la comprobación del origen.
describe("Better Auth trusted origins (e2e)", () => {
  const credentials = {
    email: "nadie@uptime.test",
    password: "e2e-password",
  }

  test("accepts the origin the request is addressed to", async ({
    anonymous,
  }) => {
    // Simula acceder desde otro dispositivo de la red por la IP del equipo.
    await anonymous
      .post("/api/auth/sign-in/email")
      .set("Host", "192.168.1.50:3000")
      .set("Origin", "http://192.168.1.50:3000")
      .send(credentials)
      .expect(401)
  })

  test("403 when the origin belongs to another site", async ({ anonymous }) => {
    const response = await anonymous
      .post("/api/auth/sign-in/email")
      .set("Host", "192.168.1.50:3000")
      .set("Origin", "https://evil.example")
      .send(credentials)
      .expect(403)

    expect(response.body).toMatchObject({ code: "INVALID_ORIGIN" })
  })
})
