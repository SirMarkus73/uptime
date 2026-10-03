import { Processor, WorkerHost } from "@nestjs/bullmq"
import { Job } from "bullmq"
import { MONITORS_QUEUE, RunMonitorJobData } from "./monitors.queue.js"
import { MonitorsService } from "./monitors.service.js"

@Processor(MONITORS_QUEUE)
export class MonitorConsumer extends WorkerHost {
  constructor(private readonly monitorsService: MonitorsService) {
    super()
  }

  async process(job: Job<RunMonitorJobData>) {
    const { monitorId } = job.data
    await this.monitorsService.runMonitor({ id: monitorId })
  }
}
