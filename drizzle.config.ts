import { defineConfig } from "drizzle-kit";

/*
 * Next.js loads `.env.local` itself, but drizzle-kit runs outside Next, so it has to be loaded
 * here. Node's built-in loader avoids adding `dotenv` for one line (`package.json` requires
 * Node >= 24). A missing file is not an error: on a deployment the variables come from the
 * environment instead.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fall back to whatever is already in the environment.
}

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
