import { defineConfig } from "vitest/config"

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    root: "./",
    include: ["**/*.spec.ts"],
    // Unit tests never reach the database, but importing the db module
    // validates the env config, so give it a placeholder instead of
    // depending on a local .env.
    env: {
      DATABASE_URL: "postgres://test:test@localhost:5432/test",
    },
  },
})
