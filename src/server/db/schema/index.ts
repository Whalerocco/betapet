/**
 * The database schema.
 *
 * `auth.ts` holds Better Auth's own tables — accounts, sessions, credentials and verification
 * tokens. It is GENERATED: `npm run auth:generate` overwrites it from the configuration in
 * `src/server/auth.ts`, so edits made here by hand are lost. Turn a change into a migration with
 * `npm run db:generate`, then apply it with `npm run db:migrate`.
 *
 * `match.ts`, `friendship.ts` and `chat.ts` hold the application's own tables: matches and the
 * seats within them, the social graph, and the messages sent within a match. All three are
 * written by hand.
 *
 * `user.name` is the profile's display name, `user.handle` the unique name others find it by
 * (DEC-027), and `user.image` its optional avatar (`online-multiplayer.md` section 10).
 * Application tables reference `user.id`, which is the `User` of section 8 — an account across
 * many matches, distinct from a `Player` within one.
 */
export * from "./auth";
export * from "./match";
export * from "./friendship";
export * from "./chat";
