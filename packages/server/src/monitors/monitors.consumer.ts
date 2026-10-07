import { Processor, WorkerHost } from "@nestjs/bullmq"
import { Job } from "bullmq"
import { ChecksService } from "./checks/checks.service.js"
import { MONITORS_QUEUE, RunMonitorJobData } from "./monitors.queue.js"

@Processor(MONITORS_QUEUE)
export class MonitorsConsumer extends WorkerHost {
  constructor(private readonly checksService: ChecksService) {
    super()
  }

  async process(job: Job<RunMonitorJobData>) {
    const { monitorId } = job.data
    await this.checksService.createCheck(monitorId)
  }
}
