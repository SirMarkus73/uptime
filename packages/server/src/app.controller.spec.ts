import { Test, type TestingModule } from "@nestjs/testing"
import { AppController } from "./app.controller.js"
import { AppService } from "./app.service.js"

describe("AppController", () => {
  let appController: AppController

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile()

    appController = app.get<AppController>(AppController)
  })

  describe("health", () => {
    it("should return {up: true}", () => {
      expect(appController.health()).toEqual({ up: true })
    })
  })
})
