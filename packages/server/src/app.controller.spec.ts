import { Test } from "@nestjs/testing"
import { test as baseTest } from "vitest"
import { AppController } from "./app.controller.js"
import { AppService } from "./app.service.js"

const test = baseTest.extend("appController", async () => {
  const app = await Test.createTestingModule({
    controllers: [AppController],
    providers: [AppService],
  }).compile()

  return app.get(AppController)
})

describe("AppController", () => {
  describe("health", () => {
    test("should return {up: true}", ({ appController }) => {
      expect(appController.health()).toEqual({ up: true })
    })
  })
})
