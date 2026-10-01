export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Permite asuntos en estilo "Añadir ..." (mayúscula inicial)
    "subject-case": [0],
  },
}
