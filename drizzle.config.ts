import { defineConfig } from "drizzle-kit";

// Only used to write new migration files (`npm run db:generate`).
// The app applies them itself when it starts, see src/db/index.ts.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
