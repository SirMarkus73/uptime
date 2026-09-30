import { authRelations } from "./schema/auth-schema.js"
import { monitorRelations } from "./schema/monitor-schema.js"
import { checkRelations } from "./schema.js"

export default { ...monitorRelations, ...authRelations, ...checkRelations }
