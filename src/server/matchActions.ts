import { eq, inArray } from "drizzle-orm";

import { createGame } from "@/game/engine/createGame";
import type { GameState } from "@/game/model/game";
import type { GameError } from "@/game/engine/gameError";
import { createPlayerId, type PlayerId } from "@/game/model/ids";
import {
  toPlayerGameView,
  type PlayerGameView,
} from "@/game/view/playerGameView";

import { db } from "./db/client";
import { user, type MatchConfiguration } from "./db/schema";
import {
  cancelInvitation,
  createMatch as storeMatch,
  loadMatchForUser,
  saveGameState,
  type MatchRecord,
} from "./matches";
import type { SessionUser } from "./session";

/**
 * The server's domain actions (`online-multiplayer.md` section 36): a client asks for a move to
 * be made, never for a state to be written.
 *
 * Every action follows the same path, which is the one section 5 lays out — authenticate,
 * authorize, load the authoritative state, run the shared engine, persist atomically, return a
 * player-safe view. Nothing here decides a rule; the engine does.
 *
 * Note what a client never sends: a `playerId`. It is derived from the session and the match's
 * seats. Section 37's example — August must not be able to act as Anna — is not a check that can
 * be forgotten here, because the identity a caller could lie about is never read.
 */

export type MatchActionFailure =
  | { readonly outcome: "NOT_FOUND" }
  | { readonly outcome: "WRONG_MATCH_STATUS"; readonly status: string }
  | { readonly outcome: "STALE_REVISION"; readonly currentRevision: number }
  | { readonly outcome: "RULE_REJECTED"; readonly error: GameError }
  | { readonly outcome: "INVALID_STATE" };

export interface MatchView {
  readonly outcome: "OK";
  readonly matchId: string;
  readonly revision: number;
  readonly status: MatchRecord["status"];
  readonly view: PlayerGameView;
}

export type MatchViewResult = MatchView | MatchActionFailure;

function seatOf(record: MatchRecord, userId: string): PlayerId | undefined {
  return record.players.find((seat) => seat.userId === userId)?.playerId;
}

function viewOf(
  record: MatchRecord,
  state: GameState,
  playerId: PlayerId,
): MatchView {
  return {
    outcome: "OK",
    matchId: record.id,
    revision: record.revision,
    status: record.status,
    view: toPlayerGameView(state, playerId),
  };
}

export interface CreateMatchRequest {
  readonly user: SessionUser;
  readonly opponentEmail: string;
  readonly configuration: MatchConfiguration;
}

export type CreateMatchResult =
  | { readonly outcome: "OK"; readonly matchId: string }
  | { readonly outcome: "OPPONENT_NOT_FOUND" }
  | { readonly outcome: "CANNOT_PLAY_ALONE" };

/**
 * Creates a match as an invitation: two seats, the agreed rules, and no game yet. The game begins
 * when the opponent accepts (`online-multiplayer.md` section 13).
 *
 * The opponent is found by email because it is the only identifier an account has today. Friends
 * and user search arrive in Milestone 7, and this is meant to be replaced by them.
 */
export async function createMatch(
  request: CreateMatchRequest,
): Promise<CreateMatchResult> {
  const [opponent] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, request.opponentEmail.trim().toLowerCase()))
    .limit(1);

  if (!opponent) return { outcome: "OPPONENT_NOT_FOUND" };
  if (opponent.id === request.user.id) return { outcome: "CANNOT_PLAY_ALONE" };

  const created = await storeMatch({
    createdByUserId: request.user.id,
    configuration: request.configuration,
    players: [
      { userId: request.user.id, playerId: createPlayerId() },
      { userId: opponent.id, playerId: createPlayerId() },
    ],
  });

  return { outcome: "OK", matchId: created.id };
}

/**
 * Accepts an invitation and starts the game (`online-multiplayer.md` section 13).
 *
 * The seats already exist, so the engine is given their ids rather than generating its own: the
 * invitation was sent to a person, and that person's seat should not change identity because a
 * game started. Who moves first is still the engine's decision, drawn from the bag as
 * `game-rules.md` section 2 requires — not the inviter's privilege.
 */
export async function acceptInvitation(
  sessionUser: SessionUser,
  matchId: string,
): Promise<MatchViewResult> {
  const record = await loadMatchForUser(matchId, sessionUser.id);
  if (!record) return { outcome: "NOT_FOUND" };

  const playerId = seatOf(record, sessionUser.id);
  if (!playerId) return { outcome: "NOT_FOUND" };

  if (record.status !== "INVITED") {
    return { outcome: "WRONG_MATCH_STATUS", status: record.status };
  }
  // Only the invited player accepts; the creator cannot accept on their behalf (section 37).
  if (record.createdByUserId === sessionUser.id) {
    return { outcome: "WRONG_MATCH_STATUS", status: record.status };
  }

  const [seatOne, seatTwo] = record.players;
  const names = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(inArray(user.id, [seatOne!.userId, seatTwo!.userId]));

  const nameFor = (userId: string) =>
    names.find((row) => row.id === userId)?.name ?? "Spelare";

  const state = createGame({
    playerOneName: nameFor(seatOne!.userId),
    playerTwoName: nameFor(seatTwo!.userId),
    rackSize: record.configuration.rackSize,
    modifiers: new Set(record.configuration.modifiers),
    polyglotLanguages: record.configuration.polyglotLanguages,
    wildLanguages: record.configuration.wildLanguages,
    playerOneId: seatOne!.playerId,
    playerTwoId: seatTwo!.playerId,
  });

  const saved = await saveGameState({
    matchId: record.id,
    actingUserId: sessionUser.id,
    expectedRevision: record.revision,
    gameState: state,
  });

  if (saved.outcome !== "SAVED") return saved as MatchActionFailure;

  return viewOf(saved.match, state, playerId);
}

/**
 * Declines an invitation (`online-multiplayer.md` section 13).
 *
 * The match becomes CANCELLED rather than being deleted: section 15 has a status for exactly this,
 * and the inviter should be able to see what became of an invitation they sent.
 */
export async function declineInvitation(
  sessionUser: SessionUser,
  matchId: string,
): Promise<{ readonly outcome: "OK" } | MatchActionFailure> {
  const record = await loadMatchForUser(matchId, sessionUser.id);
  if (!record) return { outcome: "NOT_FOUND" };
  if (!seatOf(record, sessionUser.id)) return { outcome: "NOT_FOUND" };

  if (
    record.status !== "INVITED" ||
    record.createdByUserId === sessionUser.id
  ) {
    return { outcome: "WRONG_MATCH_STATUS", status: record.status };
  }

  const changed = await cancelInvitation(record.id, record.revision);
  return changed
    ? { outcome: "OK" }
    : { outcome: "STALE_REVISION", currentRevision: record.revision };
}

/** Reads a match as one of its players may see it (`online-multiplayer.md` sections 16-17). */
export async function matchViewFor(
  sessionUser: SessionUser,
  matchId: string,
): Promise<MatchViewResult> {
  const record = await loadMatchForUser(matchId, sessionUser.id);
  if (!record) return { outcome: "NOT_FOUND" };

  const playerId = seatOf(record, sessionUser.id);
  if (!playerId) return { outcome: "NOT_FOUND" };
  if (!record.gameState) {
    return { outcome: "WRONG_MATCH_STATUS", status: record.status };
  }

  return viewOf(record, record.gameState, playerId);
}
