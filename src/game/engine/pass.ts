import type { GameState } from "../model/game";
import { addHistoryEvent, nextSequence } from "../model/history";
import { createHistoryEventId, type PlayerId } from "../model/ids";
import { playerTurn } from "../model/turnState";
import { checkNoPendingMovePreconditions } from "./actionPreconditions";
import { finalizeTurn } from "./finalizeTurn";
import type { ActionResult } from "./gameError";

/**
 * A player passes instead of playing a word or exchanging tiles (game-rules.md section 27,
 * game-engine.md section 25). Passing counts as a turn and is allowed even when the player
 * could legally play a word — the engine does not second-guess this. Increments the
 * consecutive-pass counter, which `finalizeTurn` checks against the game-end threshold.
 */
export function pass(state: GameState, playerId: PlayerId): ActionResult {
  const precondition = checkNoPendingMovePreconditions(state, playerId);
  if (precondition) return { success: false, error: precondition };

  const history = addHistoryEvent(state.history, {
    id: createHistoryEventId(),
    sequence: nextSequence(state.history),
    type: "PASS",
    playerId,
    payload: {},
  });

  const otherPlayer = state.players.find((p) => p.id !== playerId)!;

  const activeState: GameState = {
    ...state,
    history,
    consecutivePasses: state.consecutivePasses + 1,
    currentPlayerId: otherPlayer.id,
    turnState: playerTurn(otherPlayer.id),
  };

  return { success: true, state: finalizeTurn(activeState) };
}
