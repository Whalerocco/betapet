/**
 * Configuration file for `@better-auth/cli`, used by `npm run auth:generate` to regenerate
 * `src/server/db/schema/auth.ts`.
 *
 * The CLI requires a module that exports a built `auth` instance, while the application builds
 * one lazily on the first request — building it eagerly reaches the database, which would break
 * `next build` on a machine with no database configured (`src/server/auth.ts`). This file bridges
 * the two: it is the one place an instance is built at import time, and it is never imported by
 * the application.
 *
 * Generating a schema never issues a query, so the placeholder connection string the npm script
 * supplies is enough.
 */
import { createAuth } from "../src/server/auth";

export const auth = createAuth();
