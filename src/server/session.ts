import { getAuth } from "./auth";

/**
 * The signed-in user behind a request, or `undefined`.
 *
 * `online-multiplayer.md` section 37 requires every online action to establish who is acting
 * before it does anything else, and section 50 requires that to happen server-side. Identity is
 * read from the session cookie Better Auth manages, never from the request body — a client that
 * could name itself could name anyone.
 */
export interface SessionUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  /** The name others find this user by (DEC-027). */
  readonly handle: string;
}

export async function currentUser(
  headers: Headers,
): Promise<SessionUser | undefined> {
  const session = await getAuth().api.getSession({ headers });
  if (!session) return undefined;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    handle: session.user.handle,
  };
}
