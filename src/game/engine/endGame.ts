import { createGameState, type GameState } from "../model/game";
import { addHistoryEvent, nextSequence } from "../model/history";
import { createHistoryEventId, type PlayerId } from "../model/ids";
import { finishedTurnState } from "../model/turnState";
import { returnPendingTilesToRack } from "./clearPendingMove";
import { calculateFinalResult } from "./gameEndCheck";
import { actionFailure, type ActionResult } from "./gameError";

/**
 * "Avsluta spel": either player may end the game immediately, without waiting for the standard
 * end conditions (game-rules.md section 29) — a deliberate, project-owner-approved deviation from
 * those three conditions, since requiring two full rounds of passing to bail out of a game neither
 * player wants to continue was judged more annoying than useful. Unlike those conditions, this
 * doesn't require it to be the caller's turn: either player can end the game at any time.
 *
 * Final scoring is unaffected by how the game ended — `calculateFinalResult` (game-rules.md
 * section 30) still deducts each player's remaining rack tiles the same way, just tagged with a
 * distinct `MANUALLY_ENDED` reason so the result screen can say so. Any tiles the current player
 * had placed but not yet submitted are returned to their rack first, so those tiles are still
 * counted in the deduction exactly as they would be if the player had cleared or passed instead.
 */
export function endGame(state: GameState, playerId: PlayerId): ActionResult {
  if (state.status !== "ACTIVE") {
    return actionFailure("GAME_NOT_ACTIVE", "gameNotActive");
  }
  if (!state.players.some((p) => p.id === playerId)) {
    return actionFailure("INVALID_GAME_STATE", "invalidPlayer");
  }

  const stateWithoutPendingMove = returnPendingTilesToRack(state);
  const result = calculateFinalResult(stateWithoutPendingMove, "MANUALLY_ENDED");

  const history = addHistoryEvent(stateWithoutPendingMove.history, {
    id: createHistoryEventId(),
    sequence: nextSequence(stateWithoutPendingMove.history),
    type: "GAME_FINISHED",
    payload: { result },
  });

  return {
    success: true,
    state: createGameState({
      ...stateWithoutPendingMove,
      status: "FINISHED",
      turnState: finishedTurnState(),
      result,
      history,
    }),
  };
}
