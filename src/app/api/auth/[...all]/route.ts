import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/server/auth";

/**
 * Every Better Auth endpoint — sign-up, sign-in, sign-out, session — is served from this one
 * catch-all route. Better Auth owns the request handling; this file exists only to mount it.
 *
 * The handler is built on the first request rather than at module scope, because constructing it
 * reaches the database and `next build` evaluates this module while collecting page data
 * (`src/server/auth.ts`).
 */
let handler: ReturnType<typeof toNextJsHandler> | undefined;

function handlers() {
  return (handler ??= toNextJsHandler(getAuth()));
}

export function GET(request: Request) {
  return handlers().GET(request);
}

export function POST(request: Request) {
  return handlers().POST(request);
}
