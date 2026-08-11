import { createGameState, type GameState } from "../model/game";
import { addHistoryEvent, nextSequence } from "../model/history";
import { createHistoryEventId, type PlayerId } from "../model/ids";
import { waitingForOpponentApproval } from "../model/turnState";
import { actionFailure, type ActionResult } from "./gameError";

/**
 * "Spela ändå": the proposer confirms they want to propose the move despite an unknown word
 * (disputed-word-example.md section 16). Turn ownership stays with the proposer, but review
 * responsibility moves to the opponent.
 */
export function confirmProposal(
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
    return actionFailure("PROPOSAL_NOT_AVAILABLE", "noProposalToConfirm");
  }
  const pendingMove = state.pendingMove;
  if (!pendingMove || pendingMove.status !== "REQUIRES_PLAYER_CONFIRMATION") {
    return actionFailure("PROPOSAL_NOT_AVAILABLE", "noProposalToConfirm");
  }

  const reviewingPlayer = state.players.find((p) => p.id !== playerId)!;
  const unknownWords = (pendingMove.wordResults ?? [])
    .filter((result) => result.status === "UNKNOWN_WORD")
    .map((result) => result.normalizedWord);

  const history = addHistoryEvent(state.history, {
    id: createHistoryEventId(),
    sequence: nextSequence(state.history),
    type: "UNKNOWN_WORD_PROPOSED",
    playerId,
    payload: { words: unknownWords },
  });

  return {
    success: true,
    state: createGameState({
      ...state,
      pendingMove: { ...pendingMove, status: "WAITING_FOR_OPPONENT" },
      turnState: waitingForOpponentApproval(playerId, reviewingPlayer.id),
      history,
    }),
  };
}
