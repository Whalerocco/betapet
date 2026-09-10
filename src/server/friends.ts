import { and, eq, or, sql } from "drizzle-orm";

import { db } from "./db/client";
import { friendship, user, type FriendshipStatus } from "./db/schema";

/**
 * The social graph (T28.1-T28.3; `online-multiplayer.md` section 11, DEC-028).
 *
 * Two properties shape this module, and both come from the roadmap's instruction not to couple
 * friendship logic to the game engine.
 *
 * Nothing here imports the engine, and nothing here knows what a game is. A friendship is a
 * relation between two accounts; whether they ever play is the match layer's business. The one
 * place the two meet is `matchActions.createMatch`, which asks this module whether two users are
 * friends before letting one invite the other by id.
 *
 * And a request's direction is authorization, not decoration: only the addressee of a `PENDING`
 * row may answer it. Like `matches.ts`, every function folds that into the query rather than
 * checking it separately, so an id alone can never be enough to accept a request addressed to
 * somebody else.
 */

/** Another user, as this user is allowed to see them (`online-multiplayer.md` section 10). */
export interface UserSummary {
  readonly userId: string;
  readonly name: string;
  readonly handle: string;
}

export interface FriendEntry extends UserSummary {
  /** When the friendship was accepted. */
  readonly since: Date;
}

export interface FriendRequestEntry extends UserSummary {
  /** The friendship row, which is what an accept or a decline names. */
  readonly requestId: string;
  readonly sentAt: Date;
}

export interface SocialList {
  readonly friends: readonly FriendEntry[];
  /** Requests this user must answer. */
  readonly incoming: readonly FriendRequestEntry[];
  /** Requests this user has sent and nobody has answered yet. */
  readonly outgoing: readonly FriendRequestEntry[];
}

export type SendFriendRequestResult =
  /**
   * `status` is what became of the request. A request sent to somebody who had already sent one
   * the other way is an acceptance rather than a second request, so it comes back `ACCEPTED`
   * (DEC-028).
   */
  | {
      readonly outcome: "OK";
      readonly status: FriendshipStatus;
      readonly addressee: UserSummary;
    }
  | { readonly outcome: "USER_NOT_FOUND" }
  | { readonly outcome: "CANNOT_FRIEND_SELF" }
  | { readonly outcome: "ALREADY_FRIENDS" }
  | { readonly outcome: "ALREADY_REQUESTED" };

export type RespondToFriendRequestResult =
  | { readonly outcome: "OK"; readonly status: FriendshipStatus }
  /** No such pending request addressed to this user — which is also the answer when the request
   * exists but is addressed to somebody else (`online-multiplayer.md` section 38). */
  | { readonly outcome: "NOT_FOUND" };

/** The pair, ordered the way the unique index orders it, so either direction matches one row. */
function samePair(a: string, b: string) {
  return or(
    and(eq(friendship.requesterUserId, a), eq(friendship.addresseeUserId, b)),
    and(eq(friendship.requesterUserId, b), eq(friendship.addresseeUserId, a)),
  );
}

/**
 * Sends a friend request to the owner of a handle (T28.1, T28.2).
 *
 * The handle is resolved here rather than by a search endpoint of its own: the caller learns the
 * name behind a handle by successfully sending a request to it, and learns nothing at all about
 * a handle that does not exist. There is deliberately no way to ask this module for a list of
 * users (DEC-027).
 *
 * The whole thing is one transaction, because "is there already a row for this pair" and "insert
 * one" are a decision and its consequence: between them, the other person may be sending the
 * mirror-image request.
 */
export async function sendFriendRequest(input: {
  readonly userId: string;
  /** Already normalized and validated by `parseHandle`. */
  readonly handle: string;
}): Promise<SendFriendRequestResult> {
  return db.transaction(async (tx) => {
    const [addressee] = await tx
      .select({ userId: user.id, name: user.name, handle: user.handle })
      .from(user)
      .where(eq(user.handle, input.handle))
      .limit(1);

    if (!addressee) return { outcome: "USER_NOT_FOUND" };
    if (addressee.userId === input.userId) {
      return { outcome: "CANNOT_FRIEND_SELF" };
    }

    const [existing] = await tx
      .select({
        id: friendship.id,
        status: friendship.status,
        requesterUserId: friendship.requesterUserId,
      })
      .from(friendship)
      .where(samePair(input.userId, addressee.userId))
      .limit(1);

    if (existing?.status === "ACCEPTED") return { outcome: "ALREADY_FRIENDS" };

    if (existing?.status === "PENDING") {
      // Already waiting on the other person: nothing to do but say so.
      if (existing.requesterUserId === input.userId) {
        return { outcome: "ALREADY_REQUESTED" };
      }

      /*
       * They asked first, and this request answers theirs. Treating it as an acceptance is the
       * only reading that does not leave two people each waiting for the other, and it is what
       * both of them asked for (DEC-028).
       */
      await tx
        .update(friendship)
        .set({
          status: "ACCEPTED",
          respondedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(friendship.id, existing.id));

      return { outcome: "OK", status: "ACCEPTED", addressee };
    }

    if (existing) {
      // A declined request is answered and done with; a fresh one reuses the row, in the
      // direction it is now being sent (DEC-028).
      await tx
        .update(friendship)
        .set({
          requesterUserId: input.userId,
          addresseeUserId: addressee.userId,
          status: "PENDING",
          respondedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(friendship.id, existing.id));

      return { outcome: "OK", status: "PENDING", addressee };
    }

    await tx.insert(friendship).values({
      requesterUserId: input.userId,
      addresseeUserId: addressee.userId,
      status: "PENDING",
    });

    return { outcome: "OK", status: "PENDING", addressee };
  });
}

/**
 * Accepts or declines a request (T28.2).
 *
 * The `where` clause is the authorization: the row must be pending *and* addressed to this user,
 * so a requester cannot accept their own request and a stranger cannot answer somebody else's.
 */
export async function respondToFriendRequest(input: {
  readonly userId: string;
  readonly requestId: string;
  readonly response: "ACCEPT" | "DECLINE";
}): Promise<RespondToFriendRequestResult> {
  const status: FriendshipStatus =
    input.response === "ACCEPT" ? "ACCEPTED" : "DECLINED";

  const updated = await db
    .update(friendship)
    .set({ status, respondedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(friendship.id, input.requestId),
        eq(friendship.addresseeUserId, input.userId),
        eq(friendship.status, "PENDING"),
      ),
    )
    .returning({ id: friendship.id });

  return updated.length > 0
    ? { outcome: "OK", status }
    : { outcome: "NOT_FOUND" };
}

/**
 * Everything this user's friends screen shows: friends, requests to answer, requests sent (T28.2).
 *
 * One query rather than three. A friendship is stored in one direction but read in both, so the
 * other user is whichever end of the row this user is not — expressed here as a `CASE`, which is
 * what lets the friend list and both request lists come out of a single pass.
 */
export async function listSocialGraph(userId: string): Promise<SocialList> {
  const otherUserId = sql<string>`case when ${friendship.requesterUserId} = ${userId} then ${friendship.addresseeUserId} else ${friendship.requesterUserId} end`;

  const rows = await db
    .select({
      requestId: friendship.id,
      status: friendship.status,
      requesterUserId: friendship.requesterUserId,
      createdAt: friendship.createdAt,
      respondedAt: friendship.respondedAt,
      userId: user.id,
      name: user.name,
      handle: user.handle,
    })
    .from(friendship)
    .innerJoin(user, eq(user.id, otherUserId))
    .where(
      or(
        eq(friendship.requesterUserId, userId),
        eq(friendship.addresseeUserId, userId),
      ),
    );

  const friends: FriendEntry[] = [];
  const incoming: FriendRequestEntry[] = [];
  const outgoing: FriendRequestEntry[] = [];

  for (const row of rows) {
    const other = { userId: row.userId, name: row.name, handle: row.handle };

    if (row.status === "ACCEPTED") {
      friends.push({ ...other, since: row.respondedAt ?? row.createdAt });
    } else if (row.status === "PENDING") {
      const entry = {
        ...other,
        requestId: row.requestId,
        sentAt: row.createdAt,
      };
      if (row.requesterUserId === userId) outgoing.push(entry);
      else incoming.push(entry);
    }
    // A DECLINED row is history: it is neither a friendship nor a request anybody is waiting on.
  }

  // Newest request first, and friends by name — the order each list is actually read in.
  friends.sort((a, b) => a.name.localeCompare(b.name, "sv"));
  incoming.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  outgoing.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());

  return { friends, incoming, outgoing };
}

/**
 * Whether two users are friends — the check `createMatch` makes before accepting an opponent named
 * by id rather than by email (T28.3).
 */
export async function areFriends(
  userId: string,
  otherUserId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: friendship.id })
    .from(friendship)
    .where(
      and(samePair(userId, otherUserId), eq(friendship.status, "ACCEPTED")),
    )
    .limit(1);

  return Boolean(row);
}
