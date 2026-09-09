import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";

import * as schema from "./schema";

/**
 * The database connection (DEC-020: Neon Postgres, Frankfurt).
 *
 * This uses Neon's WebSocket driver rather than its HTTP one. The HTTP driver is lighter and is
 * the usual serverless default, but it cannot hold a transaction open across statements, and
 * T24.4 requires transactional updates: committing a move writes an authoritative game state and
 * bumps a match revision, and those two must not be separable. Correctness outranks the round
 * trip.
 *
 * Node 22+ ships a global WebSocket, so the driver needs no `ws` package here (`package.json`
 * requires Node >= 24). If a runtime without one ever appears, this is where it would be
 * supplied.
 */
neonConfig.webSocketConstructor ??= globalThis.WebSocket;

/**
 * One pool per process, not per request. A serverless function is reused across invocations, and
 * building a pool per request would open a new connection every time.
 *
 * `globalThis` keeps that true through `next dev`'s hot reloads, which re-evaluate this module
 * without restarting the process and would otherwise leak a pool per edit.
 */
const globalForDb = globalThis as typeof globalThis & {
  betapetDb?: NeonDatabase<typeof schema>;
};

function connect(): NeonDatabase<typeof schema> {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill in the Neon connection string.",
    );
  }

  return drizzle(new Pool({ connectionString: url }), { schema });
}

/**
 * Connecting is deferred to the first query rather than done when this module loads.
 *
 * `next build` evaluates every route module while collecting page data, so connecting at import
 * time would make a build fail on a machine that has no database configured — including the
 * hot-seat `playtest` build, which needs no database at all. Waiting until a query is actually
 * issued keeps the missing-configuration error where it belongs: at the point something tried to
 * use the database.
 */
export const db = new Proxy({} as NeonDatabase<typeof schema>, {
  get(_target, property) {
    const instance = (globalForDb.betapetDb ??= connect());
    const value = Reflect.get(instance, property) as unknown;

    // Bound, so a method taken off the proxy still runs against the real instance.
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export type Database = NeonDatabase<typeof schema>;
