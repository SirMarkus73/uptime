export const MONITORS_QUEUE = "monitors"

export type RunMonitorJobData = { monitorId: string }

// Cada monitor tiene su propio job scheduler, identificado por su id.
export const monitorSchedulerId = (monitorId: string) => `monitor:${monitorId}`
