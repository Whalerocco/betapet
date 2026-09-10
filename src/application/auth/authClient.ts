"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

/**
 * The browser half of Better Auth (DEC-020).
 *
 * It talks to `/api/auth/*` on the same origin, so it needs no configuration. Sessions live in a
 * cookie the server sets, which is why nothing here stores a token: there is no token for a
 * script to read, and every request the interface makes is authenticated by the browser sending
 * that cookie.
 *
 * The one thing it does have to be told is that a user carries a `handle` (DEC-027), so that
 * sign-up accepts one and a session reports it. The field is declared here rather than inferred
 * from the server's own type, because importing that type into browser code would make the client
 * bundle depend on the server module — which `architecture.md` keeps apart.
 */
export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: { handle: { type: "string", required: true, input: true } },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
