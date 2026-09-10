import { eq, inArray } from "drizzle-orm";

import {
  dispatchGameAction,
  type GameAction,
} from "@/application/game-controller/gameController";
import { createGame } from "@/game/engine/createGame";
import type { GameError } from "@/game/engine/gameError";
import type { Coordinate } from "@/game/model/coordinate";
import type { GameState } from "@/game/model/game";
import { createPlayerId, type PlayerId, type TileId } from "@/game/model/ids";
import {
  toPlayerGameView,
  type PlayerGameView,
} from "@/game/view/playerGameView";

import { db } from "./db/client";
import { user, type MatchConfiguration } from "./db/schema";
import { areFriends } from "./friends";
import { dependenciesFor } from "./matchDependencies";
import {
  cancelInvitation,
  createMatch as storeMatch,
  loadMatchForUser,
  saveGameState,
  type MatchRecord,
} from "./matches";
import type { OpponentReference } from "./requests";
import type { SessionUser } from "./session";

/**
 * The server's domain actions (`online-multiplayer.md` section 36): a client asks for a move to
 * be made, never for a state to be written.
 *
 * Every action follows the same path, which is the one section 5 lays out — authenticate,
 * authorize, load the authoritative state, run the shared engine, persist atomically, return a
 * player-safe view. Nothing here decides a rule; the engine does, through the same
 * `dispatchGameAction` the local game uses, so online and hot-seat play cannot drift apart.
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

/**
 * What a player may ask the server to do on their turn.
 *
 * Arranging tiles stays on the player's own device and only the finished placement is sent
 * (`online-multiplayer.md` section 19, which recommends exactly this). The server then replays
 * each placement onto the authoritative state before submitting, which is how it independently
 * validates tile ownership and placement rather than taking the client's word for either.
 */
export type TurnAction =
  | { readonly type: "PASS" }
  | { readonly type: "EXCHANGE_TILES"; readonly tileIds: readonly TileId[] }
  | {
      readonly type: "SUBMIT_MOVE";
      readonly placements: readonly {
        readonly tileId: TileId;
        readonly coordinate: Coordinate;
        readonly representedLetter?: string;
      }[];
    }
  /*
   * The disputed-word actions (`online-multiplayer.md` sections 21-25). A submitted move that
   * forms an unknown word does not become the opponent's problem by itself: the proposer must
   * first say `Spela ändå`, which is `CONFIRM_PROPOSAL`, or back out with `CANCEL_PROPOSAL`.
   * The opponent then answers with one of the last two.
   *
   * Who may send which is not decided here. Each maps to an engine action naming the player, and
   * the engine refuses a proposer reviewing their own proposal exactly as it does in a hot-seat
   * game.
   */
  | { readonly type: "CONFIRM_PROPOSAL" }
  | { readonly type: "CANCEL_PROPOSAL" }
  | { readonly type: "ACCEPT_PROPOSED_MOVE" }
  | { readonly type: "REJECT_PROPOSED_MOVE" };

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
  readonly opponent: OpponentReference;
  readonly configuration: MatchConfiguration;
}

export type CreateMatchResult =
  | { readonly outcome: "OK"; readonly matchId: string }
  | { readonly outcome: "OPPONENT_NOT_FOUND" }
  | { readonly outcome: "CANNOT_PLAY_ALONE" };

/**
 * Resolves the opponent a client named, or nothing.
 *
 * The two references are not equally trusted. An email address is a thing the inviter had to know
 * already, so knowing it is the authorization. A user id is not: ids travel in responses and are
 * guessable in a way an address is not, so one is only accepted from somebody the opponent has
 * accepted as a friend (T28.3). A stranger's id therefore resolves to nothing at all — the same
 * answer as an id that does not exist, because a different answer would confirm the account
 * (`online-multiplayer.md` section 38).
 */
async function resolveOpponent(
  request: CreateMatchRequest,
): Promise<{ readonly id: string } | undefined> {
  if (request.opponent.kind === "EMAIL") {
    const [found] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, request.opponent.email.trim().toLowerCase()))
      .limit(1);
    return found;
  }

  const { userId } = request.opponent;
  if (userId === request.user.id) return { id: userId };

  return (await areFriends(request.user.id, userId))
    ? { id: userId }
    : undefined;
}

/**
 * Creates a match as an invitation: two seats, the agreed rules, and no game yet. The game begins
 * when the opponent accepts (`online-multiplayer.md` section 13).
 *
 * An opponent is named by email address or, since T28.3, by being a friend.
 */
export async function createMatch(
  request: CreateMatchRequest,
): Promise<CreateMatchResult> {
  const opponent = await resolveOpponent(request);

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

/**
 * The engine actions one turn action becomes, in order.
 *
 * A submission starts by clearing whatever pending move the state already holds. Normally there
 * is none, but a rejected proposal leaves one behind on purpose (`online-multiplayer.md`
 * section 26: the placement returns to the proposer as editable state), and the client sends its
 * complete intended placement rather than a diff (section 19). Clearing first is therefore how a
 * second attempt after a rejection works at all — and it is safe, because the engine refuses to
 * clear a pending move that is awaiting the opponent's review.
 */
function engineActions(
  action: TurnAction,
  playerId: PlayerId,
  state: GameState,
): GameAction[] {
  switch (action.type) {
    case "PASS":
      return [{ type: "PASS", playerId }];
    case "EXCHANGE_TILES":
      return [{ type: "EXCHANGE_TILES", playerId, tileIds: action.tileIds }];
    case "CONFIRM_PROPOSAL":
      return [{ type: "CONFIRM_PROPOSAL", playerId }];
    case "CANCEL_PROPOSAL":
      return [{ type: "CANCEL_PROPOSAL", playerId }];
    case "ACCEPT_PROPOSED_MOVE":
      return [{ type: "ACCEPT_PROPOSED_MOVE", reviewingPlayerId: playerId }];
    case "REJECT_PROPOSED_MOVE":
      return [{ type: "REJECT_PROPOSED_MOVE", reviewingPlayerId: playerId }];
    case "SUBMIT_MOVE":
      return [
        ...(state.pendingMove
          ? [{ type: "CLEAR_PENDING_MOVE", playerId } as const]
          : []),
        ...action.placements.map((placement): GameAction => ({
          type: "PLACE_TILE",
          playerId,
          tileId: placement.tileId,
          coordinate: placement.coordinate,
          representedLetter: placement.representedLetter,
        })),
        { type: "SUBMIT_MOVE", playerId },
      ];
  }
}

export interface PerformTurnRequest {
  readonly user: SessionUser;
  readonly matchId: string;
  /** The revision the client believes it is acting on (`online-multiplayer.md` section 31). */
  readonly expectedRevision: number;
  readonly action: TurnAction;
}

/**
 * Runs one turn action against the authoritative state and stores the result.
 *
 * A rejected action writes nothing: the engine is run against a state built in memory, and only a
 * state the engine produced is persisted. A stale revision is likewise not an error but an
 * ordinary answer — someone else acted first, and the client should refetch.
 */
export async function performTurn(
  request: PerformTurnRequest,
): Promise<MatchViewResult> {
  const record = await loadMatchForUser(request.matchId, request.user.id);
  if (!record) return { outcome: "NOT_FOUND" };

  const playerId = seatOf(record, request.user.id);
  if (!playerId) return { outcome: "NOT_FOUND" };

  if (record.status !== "ACTIVE" || !record.gameState) {
    return { outcome: "WRONG_MATCH_STATUS", status: record.status };
  }
  if (record.revision !== request.expectedRevision) {
    return { outcome: "STALE_REVISION", currentRevision: record.revision };
  }

  const deps = await dependenciesFor(record.configuration);

  let state = record.gameState;
  for (const action of engineActions(request.action, playerId, state)) {
    const result = dispatchGameAction(state, deps, action);
    if (!result.success) {
      return { outcome: "RULE_REJECTED", error: result.error };
    }
    state = result.state;
  }

  const saved = await saveGameState({
    matchId: record.id,
    actingUserId: request.user.id,
    expectedRevision: request.expectedRevision,
    gameState: state,
  });

  if (saved.outcome !== "SAVED") return saved as MatchActionFailure;

  return viewOf(saved.match, state, playerId);
}
