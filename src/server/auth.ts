import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "./db/client";
import * as schema from "./db/schema";

/**
 * Authentication (DEC-020: Better Auth, keeping its tables in the project's own Postgres).
 *
 * `online-multiplayer.md` section 9 requires a mature managed authentication system and forbids
 * custom password handling; section 10 wants the profile kept to the minimum needed to identify
 * an opponent. Better Auth's `user.name` is that profile's `displayName` and `user.image` its
 * optional avatar, so no separate profile table is needed yet.
 *
 * Email and password is the first method, and deliberately the only one for now: section 9 says
 * the first online version does not need every method, and it is the only one that needs no
 * external service, which matters while the project is running at no cost (DEC-020). Magic links
 * and OAuth providers are configuration on this object when they are wanted.
 *
 * Nothing here reaches the game engine. The engine knows a `playerId` and nothing about sessions
 * or tokens (`tech-stack.md` section 27, `online-multiplayer.md` section 8).
 */
export function createAuth() {
  return betterAuth({
    /*
     * Better Auth needs to know its own origin to build callbacks and set cookies. In production
     * that is `BETTER_AUTH_URL`; on a Vercel preview deployment, whose URL is generated per
     * deployment and cannot be known in advance, `VERCEL_URL` is the only thing that knows it.
     * Locally both are absent and Better Auth falls back to the request's own origin.
     */
    baseURL:
      process.env.BETTER_AUTH_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : undefined),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      // No email provider is configured yet, so a verification mail could not be delivered and
      // would lock every new account out. Turn this on together with an email sender.
      requireEmailVerification: false,
    },
  });
}

const globalForAuth = globalThis as typeof globalThis & {
  betapetAuth?: ReturnType<typeof createAuth>;
};

/**
 * Built on first use rather than when this module loads, and memoized after that.
 *
 * Better Auth inspects the Drizzle instance while it is being configured, which would open the
 * database during `next build`'s page-data collection and fail any build on a machine with no
 * database configured — including the hot-seat `playtest` build, which needs none. Deferring it
 * to the first request keeps that cost where it belongs.
 *
 * The memo lives on `globalThis` so `next dev`'s hot reloads reuse one instance instead of
 * building a new one per edit.
 */
export function getAuth(): ReturnType<typeof createAuth> {
  return (globalForAuth.betapetAuth ??= createAuth());
}
