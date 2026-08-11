import { createGameState, type GameState } from "../model/game";
import type { PlayerId } from "../model/ids";
import { playerTurn } from "../model/turnState";
import { actionFailure, type ActionResult } from "./gameError";

/**
 * "Ändra": the proposer declines to propose the unknown word and returns to editing
 * (disputed-word-example.md section 15). No history event — the opponent was never asked
 * anything, and nothing was rejected.
 */
export function cancelProposal(
  state: GameState,
  playerId: PlayerId,
): ActionResult {
  if (state.status !== "ACTIVE") {
    return actionFailure("GAME_NOT_ACTIVE", "gameNotActive");
  }
  if (
    state.turnState.type !== "REQUIRES_PLAYER_CONFIRMATION" ||
    state.turnState.playerId !== playerId
  ) {
    return actionFailure("PROPOSAL_NOT_AVAILABLE", "noProposalToCancel");
  }
  const pendingMove = state.pendingMove;
  if (!pendingMove || pendingMove.status !== "REQUIRES_PLAYER_CONFIRMATION") {
    return actionFailure("PROPOSAL_NOT_AVAILABLE", "noProposalToCancel");
  }

  return {
    success: true,
    state: createGameState({
      ...state,
      pendingMove: {
        playerId: pendingMove.playerId,
        placedTiles: pendingMove.placedTiles,
        status: "EDITING",
      },
      turnState: playerTurn(playerId),
    }),
  };
}
