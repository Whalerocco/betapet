import type { GameState } from "../model/game";
import type { PlayerId } from "../model/ids";
import type { GameError } from "./gameError";

/** Checks shared by every turn action: the game must be active and it must be the acting player's turn. */
function checkTurnPreconditions(
  state: GameState,
  playerId: PlayerId,
): GameError | null {
  if (state.status !== "ACTIVE") {
    return { code: "GAME_NOT_ACTIVE", messageKey: "gameNotActive" };
  }
  if (
    state.turnState.type !== "PLAYER_TURN" ||
    state.turnState.playerId !== playerId
  ) {
    return { code: "NOT_YOUR_TURN", messageKey: "notYourTurn" };
  }
  return null;
}

/**
 * Checks shared by every pending-placement action: the turn preconditions, plus any existing
 * pending move must still be freely editable (not awaiting confirmation or opponent review —
 * those states don't exist until later milestones, but the check is here so this stays correct
 * once they do).
 */
export function checkEditPreconditions(
  state: GameState,
  playerId: PlayerId,
): GameError | null {
  const turnError = checkTurnPreconditions(state, playerId);
  if (turnError) return turnError;
  if (state.pendingMove && state.pendingMove.status !== "EDITING") {
    return { code: "INVALID_GAME_STATE", messageKey: "pendingMoveNotEditable" };
  }
  return null;
}

/**
 * Checks shared by pass and exchange (game-engine.md sections 25-26): the turn preconditions,
 * plus no pending uncommitted move at all — a player mid-placement must remove their tiles (or
 * submit/cancel) before passing or exchanging, rather than silently discarding an in-progress
 * placement.
 */
export function checkNoPendingMovePreconditions(
  state: GameState,
  playerId: PlayerId,
): GameError | null {
  const turnError = checkTurnPreconditions(state, playerId);
  if (turnError) return turnError;
  if (state.pendingMove) {
    return { code: "INVALID_GAME_STATE", messageKey: "pendingMoveInProgress" };
  }
  return null;
}
