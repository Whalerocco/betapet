import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { GameState } from "@/game/model/game";
import type { PlayerId } from "@/game/model/ids";
import { parseGameState } from "@/game/model/serialization";

import { db } from "./db/client";
import { friendship, match, matchPlayer, user } from "./db/schema";

/**
 * What needs this user's attention, derived (T30.1; `online-multiplayer.md` sections 41-43).
 *
 * There is no notification table, and that is the design (DEC-031). Five of the six things
 * Milestone 7.2 asks to be notified about are *states* the database already holds — an
 * invitation addressed to me, a friend request addressed to me, a match waiting on my move or my
 * verdict, a finished game — and the sixth, a rejected move, is an event the engine already
 * wrote into the game's own history. A second copy of any of it could only drift from the
 * authoritative record, which is exactly what section 34 warns against, and every write site
 * would have to remember to keep it up to date.
 *
 * So this module reads rather than remembers. The one thing it cannot read is whether the user
 * has *seen* something, because that is not a fact about the game; `match_player.lastSeenRevision`
 * is the whole of what is stored, and only a finished match needs it — everything else stops
 * being true the moment the player acts on it.
 *
 * Nothing here decides Swedish wording. A notification comes out as a type and the facts behind
 * it, and the interface turns that into a sentence (`architecture.md` section 25), so the server
 * is not the place a phrase has to be changed.
 */

export type NotificationType =
  /** A move is owed. */
  | "YOUR_TURN"
  /**
   * Also a move that is owed, but for a reason worth naming: the opponent rejected the word and
   * gave the turn back. Without this the player is told "your turn" for a turn they thought they
   * had already taken.
   */
  | "MOVE_REJECTED"
  /** A proposed unknown word is waiting on this user's verdict. */
  | "AWAITING_YOUR_REVIEW"
  | "MATCH_INVITATION"
  | "MATCH_FINISHED"
  | "FRIEND_REQUEST";

export interface Notification {
  /**
   * Stable for as long as the notification itself is: the same match in the same condition
   * produces the same id across polls, so a list does not flicker and a key does not change
   * under a rendered row.
   */
  readonly id: string;
  readonly type: NotificationType;
  /** The other person, as this user is allowed to see them (section 10). */
  readonly otherUserName: string;
  readonly otherUserHandle?: string;
  /** Present for every match notification; absent for a friend request. */
  readonly matchId?: string;
  /** Present only for a friend request, which is answered by naming the row. */
  readonly requestId?: string;
  /**
   * The words at issue — the ones proposed for review, or the ones that were rejected. Empty for
   * everything else.
   */
  readonly words: readonly string[];
  /** Only for `MATCH_FINISHED`: how it ended, from this user's side. */
  readonly outcome?: "WON" | "LOST" | "TIED";
  /** When the thing being reported last changed, newest first in the list. */
  readonly occurredAt: Date;
}

/**
 * The match rows a notification can come from, before the game state is consulted.
 *
 * Deliberately the same shape of query the match list uses: columns only, the opponent from the
 * seats, and no game state, because most matches will not need theirs read.
 */
interface MatchRow {
  readonly id: string;
  readonly status: string;
  readonly revision: number;
  readonly currentActorUserId: string | null;
  readonly pendingAction: string | null;
  readonly createdByUserId: string;
  readonly lastSeenRevision: number | null;
  readonly opponentName: string;
  readonly opponentHandle: string;
  readonly updatedAt: Date;
}

/** How a finished game went for one of its players. */
function outcomeFor(
  state: GameState,
  playerId: PlayerId,
): "WON" | "LOST" | "TIED" | undefined {
  if (state.status !== "FINISHED") return undefined;

  const winners = state.result.winnerPlayerIds;
  // An empty winner list is the engine's representation of a tie (`gameResult.ts`).
  if (winners.length === 0) return "TIED";
  return winners.includes(playerId) ? "WON" : "LOST";
}

/**
 * Whether the turn came back to this player because the opponent rejected their word.
 *
 * Read from the last history event rather than from a flag, because the engine writes one and a
 * flag would be a second copy. It is safe to look only at the last event: a rejection hands the
 * turn straight back to the proposer with their tiles still on the board, so nothing else can
 * have happened in between — the next event will be whatever they do about it.
 */
function rejectionAwaiting(
  state: GameState,
  playerId: PlayerId,
): readonly string[] | undefined {
  const last = state.history.events.at(-1);
  if (last?.type !== "UNKNOWN_WORD_REJECTED") return undefined;
  return last.payload.proposingPlayerId === playerId
    ? last.payload.words
    : undefined;
}

/** The words this user is being asked to rule on, from the proposal the engine recorded. */
function wordsAwaitingReview(state: GameState): readonly string[] {
  const last = state.history.events.at(-1);
  return last?.type === "UNKNOWN_WORD_PROPOSED" ? last.payload.words : [];
}

/**
 * Every match this user is in, with the seat's seen-marker and the opponent.
 *
 * `INVITATION_SENT` and `CANCELLED` matches are fetched too and filtered below rather than in
 * SQL: the categories are decided in one place, and the list is a player's own matches, not a
 * table scan.
 */
async function matchRows(userId: string): Promise<readonly MatchRow[]> {
  const mine = alias(matchPlayer, "mine");
  const theirs = alias(matchPlayer, "theirs");

  return db
    .select({
      id: match.id,
      status: sql<string>`${match.status}`,
      revision: match.revision,
      currentActorUserId: match.currentActorUserId,
      pendingAction: sql<string | null>`${match.pendingAction}`,
      createdByUserId: match.createdByUserId,
      lastSeenRevision: mine.lastSeenRevision,
      opponentName: user.name,
      opponentHandle: user.handle,
      updatedAt: match.updatedAt,
    })
    .from(match)
    .innerJoin(mine, and(eq(mine.matchId, match.id), eq(mine.userId, userId)))
    .innerJoin(
      theirs,
      and(eq(theirs.matchId, match.id), ne(theirs.userId, userId)),
    )
    .innerJoin(user, eq(user.id, theirs.userId))
    .orderBy(desc(match.updatedAt));
}

/**
 * The game states for the handful of matches whose notification needs one, in one query.
 *
 * Which ones those are is the point: a match waiting on this user, so a rejection can be named
 * and a proposed word quoted, and a finished match they have not looked at, so the result can be
 * given. Every other match is answered from columns alone, exactly as the list is.
 */
async function statesFor(
  ids: readonly string[],
  userId: string,
): Promise<Map<string, { state: GameState; playerId: PlayerId }>> {
  const states = new Map<string, { state: GameState; playerId: PlayerId }>();
  if (ids.length === 0) return states;

  const rows = await db
    .select({
      id: match.id,
      gameState: match.gameState,
      playerId: matchPlayer.playerId,
    })
    .from(match)
    .innerJoin(
      matchPlayer,
      and(eq(matchPlayer.matchId, match.id), eq(matchPlayer.userId, userId)),
    )
    .where(inArray(match.id, [...ids]));

  for (const row of rows) {
    // A state the engine would reject is treated as no state at all, on the same grounds
    // `matches.ts` gives: the notification simply loses its detail rather than the feed failing.
    const state = row.gameState ? parseGameState(row.gameState) : undefined;
    if (state) states.set(row.id, { state, playerId: row.playerId });
  }

  return states;
}

/** Friend requests addressed to this user and still unanswered (T28.2). */
async function friendRequestNotifications(
  userId: string,
): Promise<readonly Notification[]> {
  const rows = await db
    .select({
      requestId: friendship.id,
      name: user.name,
      handle: user.handle,
      createdAt: friendship.createdAt,
    })
    .from(friendship)
    .innerJoin(user, eq(user.id, friendship.requesterUserId))
    .where(
      and(
        eq(friendship.addresseeUserId, userId),
        eq(friendship.status, "PENDING"),
      ),
    );

  return rows.map((row) => ({
    id: `friend-request:${row.requestId}`,
    type: "FRIEND_REQUEST" as const,
    otherUserName: row.name,
    otherUserHandle: row.handle,
    requestId: row.requestId,
    words: [],
    occurredAt: row.createdAt,
  }));
}

/**
 * Everything waiting on this user, newest first (T30.1).
 *
 * A match contributes at most one notification, because a player cannot owe two things about the
 * same game at once: it is either their move, their verdict, an invitation they have not
 * answered, or a result they have not seen.
 */
export async function listNotificationsForUser(
  userId: string,
): Promise<readonly Notification[]> {
  const rows = await matchRows(userId);

  const needsState = rows
    .filter(
      (row) =>
        (row.status === "ACTIVE" && row.currentActorUserId === userId) ||
        (row.status === "FINISHED" &&
          row.revision > (row.lastSeenRevision ?? 0)),
    )
    .map((row) => row.id);

  const states = await statesFor(needsState, userId);

  const notifications: Notification[] = [];

  for (const row of rows) {
    const other = {
      otherUserName: row.opponentName,
      otherUserHandle: row.opponentHandle,
      matchId: row.id,
      occurredAt: row.updatedAt,
    };

    if (row.status === "INVITED") {
      // An invitation this user sent is waiting on the other person, not on them.
      if (row.createdByUserId === userId) continue;
      notifications.push({
        id: `match-invitation:${row.id}`,
        type: "MATCH_INVITATION",
        ...other,
        words: [],
      });
      continue;
    }

    if (row.status === "FINISHED") {
      if (row.revision <= (row.lastSeenRevision ?? 0)) continue;
      notifications.push({
        id: `match-finished:${row.id}:${row.revision}`,
        type: "MATCH_FINISHED",
        ...other,
        words: [],
        outcome: (() => {
          const game = states.get(row.id);
          return game ? outcomeFor(game.state, game.playerId) : undefined;
        })(),
      });
      continue;
    }

    if (row.status !== "ACTIVE" || row.currentActorUserId !== userId) continue;

    const game = states.get(row.id);

    if (row.pendingAction === "REVIEW") {
      notifications.push({
        id: `match-review:${row.id}:${row.revision}`,
        type: "AWAITING_YOUR_REVIEW",
        ...other,
        words: game ? wordsAwaitingReview(game.state) : [],
      });
      continue;
    }

    const rejected = game
      ? rejectionAwaiting(game.state, game.playerId)
      : undefined;

    notifications.push({
      id: rejected
        ? `match-rejected:${row.id}:${row.revision}`
        : `match-turn:${row.id}:${row.revision}`,
      type: rejected ? "MOVE_REJECTED" : "YOUR_TURN",
      ...other,
      words: rejected ?? [],
    });
  }

  notifications.push(...(await friendRequestNotifications(userId)));

  // Newest first, which is the order a feed is read in.
  return notifications.sort(
    (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
  );
}

/**
 * Records that this user has seen the match as it currently stands (T30.1).
 *
 * Called when a match is opened, which is the moment "I have seen this" becomes true. The revision
 * is read from the row rather than taken from the caller: a client that named one could mark a
 * match seen at a revision that never existed, and unlike a turn action there is nothing here to
 * guard against a stale write — seeing an older state is simply seeing less.
 *
 * A user who does not play in the match changes nothing, and is told so the same way every other
 * read is: not with a refusal, which would confirm the match exists (section 38).
 */
export async function markMatchSeen(
  matchId: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .update(matchPlayer)
    .set({
      lastSeenRevision: sql`(select ${match.revision} from ${match} where ${match.id} = ${matchPlayer.matchId})`,
    })
    .where(
      and(eq(matchPlayer.matchId, matchId), eq(matchPlayer.userId, userId)),
    )
    .returning({ userId: matchPlayer.userId });

  return rows.length > 0;
}

/**
 * How many notifications of each kind this user has — what the match list's badges show.
 *
 * Derived from the same list rather than from a second query, so a badge and the screen it leads
 * to can never disagree about what is waiting.
 */
export function countByType(
  notifications: readonly Notification[],
): Readonly<Record<NotificationType, number>> {
  const counts: Record<NotificationType, number> = {
    YOUR_TURN: 0,
    MOVE_REJECTED: 0,
    AWAITING_YOUR_REVIEW: 0,
    MATCH_INVITATION: 0,
    MATCH_FINISHED: 0,
    FRIEND_REQUEST: 0,
  };
  for (const notification of notifications) counts[notification.type] += 1;
  return counts;
}
