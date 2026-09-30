import { authRelations } from "./schema/auth-schema.js"
import { monitorRelations } from "./schema/monitor-schema.js"

export default { ...monitorRelations, ...authRelations }
