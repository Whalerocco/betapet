import type { GameState } from "../model/game";
import type { PlayerId } from "../model/ids";
import type { GameError } from "./gameError";

/**
 * Checks shared by every pending-placement action: the game must be active, it must be the
 * acting player's turn, and any existing pending move must still be freely editable (not
 * awaiting confirmation or opponent review — those states don't exist until later milestones,
 * but the check is here so this stays correct once they do).
 */
export function checkEditPreconditions(
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
  if (state.pendingMove && state.pendingMove.status !== "EDITING") {
    return { code: "INVALID_GAME_STATE", messageKey: "pendingMoveNotEditable" };
  }
  return null;
}
