import { createGameState, type GameState } from "../model/game";
import { addHistoryEvent, nextSequence } from "../model/history";
import { createHistoryEventId } from "../model/ids";
import { finishedTurnState } from "../model/turnState";
import { checkGameEnd } from "./gameEndCheck";

/**
 * Shared tail of every turn-ending action (word move commit, pass, exchange): given a state
 * already updated for the acting player with currentPlayerId/turnState tentatively set to the
 * next player, either returns it as-is (game continues) or transitions to FINISHED with a
 * recorded GAME_FINISHED event (game-rules.md section 29).
 */
export function finalizeTurn(state: GameState): GameState {
  const endCheck = checkGameEnd(state);
  if (!endCheck.ended) {
    return createGameState(state);
  }

  const history = addHistoryEvent(state.history, {
    id: createHistoryEventId(),
    sequence: nextSequence(state.history),
    type: "GAME_FINISHED",
    payload: { result: endCheck.result },
  });

  return createGameState({
    ...state,
    status: "FINISHED",
    turnState: finishedTurnState(),
    result: endCheck.result,
    history,
  });
}
