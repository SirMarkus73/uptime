import { BadRequestException } from "@nestjs/common"
import { decodeChecksCursor, encodeChecksCursor } from "./find-all.dto.js"

// El esquema de la tabla importa la configuración; se mockea la base de datos
// para que no se abra ninguna conexión.
vi.mock("../../../db/index.js", () => ({ db: {} }))

const CHECK_ID = "3f2e1d0c-9b8a-4c7d-8e6f-5a4b3c2d1e0f"

const cursor = { checkedAt: "2026-09-30T00:40:00.123Z", id: CHECK_ID }

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url")
}

describe("encodeChecksCursor", () => {
  test("encodes the cursor as base64url JSON", () => {
    const encoded = encodeChecksCursor(cursor)

    expect(encoded).toMatch(/^[\w-]+$/)
    expect(
      JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8")),
    ).toEqual(cursor)
  })
})

describe("decodeChecksCursor", () => {
  test("returns the cursor encoded by encodeChecksCursor", () => {
    expect(decodeChecksCursor(encodeChecksCursor(cursor))).toEqual(cursor)
  })

  test.for<[string, string]>([
    ["is not JSON", Buffer.from("not json").toString("base64url")],
    ["has only the date", encode(cursor.checkedAt)],
    ["has no id", encode({ checkedAt: cursor.checkedAt })],
    ["has an invalid id", encode({ checkedAt: cursor.checkedAt, id: "1" })],
    ["has an invalid date", encode({ checkedAt: "yesterday", id: CHECK_ID })],
  ])("throws BadRequestException when the cursor %s", ([, value]) => {
    expect(() => decodeChecksCursor(value)).toThrow(BadRequestException)
  })
})
