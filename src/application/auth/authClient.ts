"use client";

import { createAuthClient } from "better-auth/react";

/**
 * The browser half of Better Auth (DEC-020).
 *
 * It talks to `/api/auth/*` on the same origin, so it needs no configuration. Sessions live in a
 * cookie the server sets, which is why nothing here stores a token: there is no token for a
 * script to read, and every request the interface makes is authenticated by the browser sending
 * that cookie.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
