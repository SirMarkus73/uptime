const TEMP__ID_PREFIX = "temp-"

export const createTempId = (id: string) => `${TEMP__ID_PREFIX}${id}`
export const isTempId = (id: string) => id.startsWith(TEMP__ID_PREFIX)
