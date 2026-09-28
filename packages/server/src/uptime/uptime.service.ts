import { Injectable, Logger } from "@nestjs/common"
import { HttpClient, HttpNetworkError } from "@nestjs/http-client"
import { checkStateDto } from "./dto/check-state.dto.js"

@Injectable()
export class UptimeService {
  private readonly logger: Logger

  constructor(private readonly client: HttpClient) {
    this.logger = new Logger(UptimeService.name)
  }

  async checkState(url: string): Promise<checkStateDto> {
    const start = performance.now()

    try {
      const response = await this.client.head(url, {
        retry: false,
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
        throwOnHttpError: false,
      })

      const end = performance.now()

      return {
        isUp: response.status < 400,
        statusCode: response.status,
        responseTimeMs: end - start,
        fetchError: null,
        checkedAt: new Date().toISOString(),
      }
    } catch (error) {
      const end = performance.now()

      let errorCode = ""

      if (error instanceof HttpNetworkError) {
        this.logger.warn(`${url} -> DOWN: ${error.name}: ${error.message}`)

        errorCode = (error.cause as { code: string }).code
      }

      if (
        !errorCode &&
        error instanceof Error &&
        error.name === "TimeoutError"
      ) {
        this.logger.warn(`${url} -> DOWN: Timeout`)

        errorCode = "TIMEOUT"
      }

      if (!errorCode) {
        this.logger.error(`${url} -> DOWN: Unknown`)

        errorCode = "UNKNOWN_ERROR"
      }

      return {
        isUp: false,
        statusCode: null,
        responseTimeMs: end - start,
        fetchError: errorCode,
        checkedAt: new Date().toISOString(),
      }
    }
  }
}
