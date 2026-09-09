import { and, desc, eq, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { GameState } from "@/game/model/game";
import type { PlayerId } from "@/game/model/ids";
import { parseGameState } from "@/game/model/serialization";

import { db } from "./db/client";
import {
  match,
  matchPlayer,
  user,
  type MatchConfiguration,
  type MatchPendingAction,
  type MatchStatus,
} from "./db/schema";

/**
 * Storage for online matches (T24.4; `online-multiplayer.md` sections 31-38).
 *
 * Two rules shape this module.
 *
 * The first is that the server is authoritative, so nothing here trusts what it is given: a state
 * is validated by the engine's own invariant check before it is written, and it is validated
 * again when it is read back, because a row is exactly where a corrupt state would appear.
 *
 * The second is that authorization is not a separate step a caller might forget (section 37).
 * Every function that reaches a match takes the acting user and folds participation into the
 * query itself, so a match id alone can never be enough to read or write a game — which is what
 * section 38 requires.
 */

export interface MatchSeat {
  readonly userId: string;
  /** The engine's id for this seat inside the game state. */
  readonly playerId: PlayerId;
}

export interface MatchRecord {
  readonly id: string;
  readonly status: MatchStatus;
  readonly revision: number;
  readonly configurationId: string;
  readonly configuration: MatchConfiguration;
  /** Absent until the invitation is accepted and a game exists. */
  readonly gameState?: GameState;
  readonly currentActorUserId?: string;
  readonly createdByUserId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastActionAt?: Date;
  readonly players: readonly MatchSeat[];
}

export interface CreateMatchInput {
  readonly createdByUserId: string;
  readonly configuration: MatchConfiguration;
  /** Exactly two seats: Betapet is a two-player game (`game-rules.md`). */
  readonly players: readonly [MatchSeat, MatchSeat];
  /** A match with a state is already under way; without one it is still an invitation. */
  readonly gameState?: GameState;
}

export interface SaveGameStateInput {
  readonly matchId: string;
  readonly actingUserId: string;
  /** The revision the caller believes it is acting on (section 31). */
  readonly expectedRevision: number;
  readonly gameState: GameState;
}

export type SaveGameStateResult =
  | { readonly outcome: "SAVED"; readonly match: MatchRecord }
  /** Someone else wrote first — the caller must refetch and decide again (section 31). */
  | { readonly outcome: "STALE_REVISION"; readonly currentRevision: number }
  | { readonly outcome: "NOT_FOUND" }
  | { readonly outcome: "INVALID_STATE" };

class InvalidStateError extends Error {}

/**
 * A match row as it is meant to be used, with the stored state validated.
 *
 * A state that fails the engine's invariant check is dropped rather than returned, on the same
 * grounds `parseGameState` gives: a corrupt or foreign record is an expected condition for a
 * store, and handing a caller a state the engine would reject is worse than handing it none.
 */
function toRecord(
  row: typeof match.$inferSelect,
  players: readonly MatchSeat[],
): MatchRecord {
  return {
    id: row.id,
    status: row.status,
    revision: row.revision,
    configurationId: row.configurationId,
    configuration: row.configuration,
    gameState: row.gameState ? parseGameState(row.gameState) : undefined,
    currentActorUserId: row.currentActorUserId ?? undefined,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastActionAt: row.lastActionAt ?? undefined,
    players,
  };
}

/**
 * Who the match is waiting for, and what for.
 *
 * Read from the turn state rather than from `currentPlayerId`. The two agree for an ordinary turn
 * and part company exactly where it matters: while a proposed word awaits review the current
 * player is still the proposer, but the player who must act is the reviewer. Deriving this from
 * `currentPlayerId` would file a match in the reviewer's "waiting for the opponent" pile while
 * the opponent waited for them.
 */
function waitingOn(
  state: GameState,
  players: readonly MatchSeat[],
): { userId?: string; action?: MatchPendingAction } {
  const userFor = (playerId: PlayerId) =>
    players.find((seat) => seat.playerId === playerId)?.userId;

  switch (state.turnState.type) {
    case "PLAYER_TURN":
      return { userId: userFor(state.turnState.playerId), action: "PLAY" };
    case "REQUIRES_PLAYER_CONFIRMATION":
      // The proposer's own move is unfinished until they confirm it or withdraw it.
      return { userId: userFor(state.turnState.playerId), action: "PLAY" };
    case "WAITING_FOR_OPPONENT_APPROVAL":
      return {
        userId: userFor(state.turnState.reviewingPlayerId),
        action: "REVIEW",
      };
    case "FINISHED":
      return {};
  }
}

/**
 * Creates a match and its two seats as one transaction.
 *
 * Both tables must land together: a match with no seats belongs to nobody, and by section 37 that
 * means nobody could read it, act in it, or clean it up.
 */
export async function createMatch(
  input: CreateMatchInput,
): Promise<MatchRecord> {
  const [seatOne, seatTwo] = input.players;
  if (seatOne.userId === seatTwo.userId) {
    throw new Error("A match needs two different users");
  }
  if (seatOne.playerId === seatTwo.playerId) {
    throw new Error("A match's two seats need different player ids");
  }
  if (input.gameState && !parseGameState(input.gameState)) {
    throw new Error("Refusing to store a game state the engine would reject");
  }

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(match)
      .values({
        status: input.gameState ? "ACTIVE" : "INVITED",
        configurationId: input.configuration.configurationId,
        configuration: input.configuration,
        gameState: input.gameState,
        currentActorUserId: input.gameState
          ? waitingOn(input.gameState, input.players).userId
          : undefined,
        pendingAction: input.gameState
          ? waitingOn(input.gameState, input.players).action
          : undefined,
        createdByUserId: input.createdByUserId,
      })
      .returning();

    await tx.insert(matchPlayer).values(
      input.players.map((seat) => ({
        matchId: row!.id,
        userId: seat.userId,
        playerId: seat.playerId,
      })),
    );

    return toRecord(row!, input.players);
  });
}

async function seatsOf(
  tx: Pick<typeof db, "select">,
  matchId: string,
): Promise<readonly MatchSeat[]> {
  const rows = await tx
    .select({
      userId: matchPlayer.userId,
      playerId: matchPlayer.playerId,
    })
    .from(matchPlayer)
    .where(eq(matchPlayer.matchId, matchId));

  return rows;
}

/**
 * Reads one match, but only for a user who plays in it.
 *
 * A non-participant gets `undefined` rather than a refusal, so that a match id cannot be used to
 * discover which matches exist (section 38: an id is not authorization).
 */
export async function loadMatchForUser(
  matchId: string,
  userId: string,
): Promise<MatchRecord | undefined> {
  const [row] = await db
    .select({ match })
    .from(match)
    .innerJoin(matchPlayer, eq(matchPlayer.matchId, match.id))
    .where(and(eq(match.id, matchId), eq(matchPlayer.userId, userId)))
    .limit(1);

  if (!row) return undefined;

  return toRecord(row.match, await seatsOf(db, matchId));
}

/**
 * Where a match belongs in the player's list (`tasks.md` T27.1), from that player's side.
 *
 * The same match is in different piles for the two players, which is why this is derived per
 * viewer rather than stored. The Swedish labels the interface shows are, in order: `Din tur`,
 * `Ord att granska`, `Väntar på motståndaren`, `Avslutade`.
 */
export type MatchListCategory =
  | "YOUR_TURN"
  | "AWAITING_YOUR_REVIEW"
  | "WAITING_FOR_OPPONENT"
  | "FINISHED"
  | "INVITATION_RECEIVED"
  | "INVITATION_SENT"
  | "CANCELLED";

export interface MatchListEntry {
  readonly id: string;
  readonly status: MatchStatus;
  readonly revision: number;
  readonly category: MatchListCategory;
  readonly opponentName: string;
  readonly updatedAt: Date;
  readonly lastActionAt?: Date;
}

function categorize(
  row: {
    status: MatchStatus;
    currentActorUserId: string | null;
    pendingAction: MatchPendingAction | null;
    createdByUserId: string;
  },
  userId: string,
): MatchListCategory {
  switch (row.status) {
    case "FINISHED":
      return "FINISHED";
    case "CANCELLED":
      return "CANCELLED";
    case "INVITED":
      return row.createdByUserId === userId
        ? "INVITATION_SENT"
        : "INVITATION_RECEIVED";
    case "ACTIVE":
      if (row.currentActorUserId !== userId) return "WAITING_FOR_OPPONENT";
      return row.pendingAction === "REVIEW"
        ? "AWAITING_YOUR_REVIEW"
        : "YOUR_TURN";
  }
}

/**
 * Every match a user plays in, most recently active first — the match list of section 14.
 *
 * The game state is deliberately not read here. What a list needs is the opponent's name and
 * which pile the match belongs in, and both come from columns: the opponent from the seats, and
 * the pile from the status and the two derived columns that say who the match is waiting for and
 * what for. Deserializing every game to draw a list would be wasteful, and section 34 asks for
 * exactly this instead.
 */
export async function listMatchesForUser(
  userId: string,
): Promise<readonly MatchListEntry[]> {
  const mine = alias(matchPlayer, "mine");
  const theirs = alias(matchPlayer, "theirs");

  const rows = await db
    .select({
      id: match.id,
      status: match.status,
      revision: match.revision,
      currentActorUserId: match.currentActorUserId,
      pendingAction: match.pendingAction,
      createdByUserId: match.createdByUserId,
      opponentName: user.name,
      updatedAt: match.updatedAt,
      lastActionAt: match.lastActionAt,
    })
    .from(match)
    .innerJoin(mine, and(eq(mine.matchId, match.id), eq(mine.userId, userId)))
    .innerJoin(
      theirs,
      and(eq(theirs.matchId, match.id), ne(theirs.userId, userId)),
    )
    .innerJoin(user, eq(user.id, theirs.userId))
    .orderBy(desc(match.updatedAt));

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    revision: row.revision,
    category: categorize(row, userId),
    opponentName: row.opponentName,
    updatedAt: row.updatedAt,
    lastActionAt: row.lastActionAt ?? undefined,
  }));
}

/**
 * Writes a new authoritative state for a match, as one transition (section 35).
 *
 * The state, the revision, whose turn it is next and the match's status all move together in a
 * single conditional UPDATE. That is what makes a double-submitted action harmless (section 32):
 * the second write finds a revision that no longer matches and changes nothing, rather than
 * scoring twice or advancing two turns.
 *
 * A user who does not play in the match is told NOT_FOUND rather than refused, for the same
 * reason `loadMatchForUser` returns nothing: a match id must not become a way to learn that a
 * match exists.
 *
 * `currentActorUserId` and `status` are derived here from the state rather than taken from the
 * caller, so the columns the match list is drawn from cannot drift away from the game they
 * describe. CANCELLED is not reachable this way on purpose — cancelling a match is a separate
 * action, not the result of playing.
 */
export async function saveGameState(
  input: SaveGameStateInput,
): Promise<SaveGameStateResult> {
  try {
    return await db.transaction(async (tx) => {
      const seats = await seatsOf(tx, input.matchId);
      if (!seats.some((seat) => seat.userId === input.actingUserId)) {
        return { outcome: "NOT_FOUND" } as const;
      }

      if (!parseGameState(input.gameState)) {
        throw new InvalidStateError();
      }

      const [row] = await tx
        .update(match)
        .set({
          gameState: input.gameState,
          revision: input.expectedRevision + 1,
          status: input.gameState.status === "FINISHED" ? "FINISHED" : "ACTIVE",
          currentActorUserId: waitingOn(input.gameState, seats).userId ?? null,
          pendingAction: waitingOn(input.gameState, seats).action ?? null,
          updatedAt: new Date(),
          lastActionAt: new Date(),
        })
        .where(
          and(
            eq(match.id, input.matchId),
            eq(match.revision, input.expectedRevision),
          ),
        )
        .returning();

      if (row) {
        return { outcome: "SAVED", match: toRecord(row, seats) } as const;
      }

      // The update matched nothing: either the match is gone, or someone wrote first.
      const [current] = await tx
        .select({ revision: match.revision })
        .from(match)
        .where(eq(match.id, input.matchId))
        .limit(1);

      return current
        ? ({
            outcome: "STALE_REVISION",
            currentRevision: current.revision,
          } as const)
        : ({ outcome: "NOT_FOUND" } as const);
    });
  } catch (error) {
    if (error instanceof InvalidStateError) {
      return { outcome: "INVALID_STATE" };
    }
    throw error;
  }
}

/**
 * Cancels an invitation that was never accepted, guarded by the same revision check every other
 * write uses so that a decline cannot land on a match that has meanwhile started.
 *
 * Returns whether the row changed.
 */
export async function cancelInvitation(
  matchId: string,
  expectedRevision: number,
): Promise<boolean> {
  const rows = await db
    .update(match)
    .set({
      status: "CANCELLED",
      revision: expectedRevision + 1,
      currentActorUserId: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(match.id, matchId),
        eq(match.revision, expectedRevision),
        eq(match.status, "INVITED"),
      ),
    )
    .returning({ id: match.id });

  return rows.length > 0;
}
