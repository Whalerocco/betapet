import { createGameState, type GameState } from "../model/game";
import { addHistoryEvent, nextSequence } from "../model/history";
import { createHistoryEventId, type PlayerId } from "../model/ids";
import { playerTurn } from "../model/turnState";
import { actionFailure, type ActionResult } from "./gameError";

/**
 * "Neka": the opponent rejects the proposed move (disputed-word-example.md sections 29-31).
 * Score, tile bag, and accepted vocabulary are all untouched; the proposer regains their turn
 * with the placed tiles preserved and immediately editable (no separate "unlock" step needed —
 * the pending move goes straight back to EDITING).
 */
export function rejectProposedMove(
  state: GameState,
  reviewingPlayerId: PlayerId,
): ActionResult {
  if (state.status !== "ACTIVE") {
    return actionFailure("GAME_NOT_ACTIVE", "gameNotActive");
  }
  if (
    state.turnState.type !== "WAITING_FOR_OPPONENT_APPROVAL" ||
    state.turnState.reviewingPlayerId !== reviewingPlayerId
  ) {
    return actionFailure("NOT_AUTHORIZED_TO_APPROVE", "notAuthorizedToApprove");
  }
  const pendingMove = state.pendingMove;
  if (!pendingMove || pendingMove.status !== "WAITING_FOR_OPPONENT") {
    return actionFailure("PROPOSAL_NOT_AVAILABLE", "noProposalToReject");
  }

  const proposingPlayerId = state.turnState.proposingPlayerId;
  const unknownWords = (pendingMove.wordResults ?? [])
    .filter((result) => result.status === "UNKNOWN_WORD")
    .map((result) => result.normalizedWord);

  const history = addHistoryEvent(state.history, {
    id: createHistoryEventId(),
    sequence: nextSequence(state.history),
    type: "UNKNOWN_WORD_REJECTED",
    playerId: reviewingPlayerId,
    payload: { proposingPlayerId, reviewingPlayerId, words: unknownWords },
  });

  return {
    success: true,
    state: createGameState({
      ...state,
      pendingMove: {
        playerId: pendingMove.playerId,
        placedTiles: pendingMove.placedTiles,
        status: "EDITING",
      },
      turnState: playerTurn(proposingPlayerId),
      history,
    }),
  };
}
