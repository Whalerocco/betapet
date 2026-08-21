import type { GameState } from "../model/game";
import type { GameConfiguration } from "../model/gameConfiguration";
import { addHistoryEvent, nextSequence } from "../model/history";
import { createHistoryEventId, type PlayerId } from "../model/ids";
import { commitMove } from "./commitMove";
import { actionFailure, type ActionResult } from "./gameError";
import { activeWildLanguageIndex } from "./wildRotation";

/**
 * "Godkänn": the opponent accepts the proposed move (disputed-word-example.md sections 22-26).
 * Atomically commits the whole move via the same commitMove used for normal moves, and adds
 * every unknown word to this game's accepted vocabulary. Under Wild mode (DEC-012), the newly
 * accepted words are scoped to whichever language was active immediately before this
 * acceptance — the same language the proposer's move was actually classified against.
 */
export function acceptProposedMove(
  state: GameState,
  reviewingPlayerId: PlayerId,
  configuration: GameConfiguration,
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
  if (
    !pendingMove ||
    pendingMove.status !== "WAITING_FOR_OPPONENT" ||
    !pendingMove.formedWords ||
    !pendingMove.wordResults ||
    !pendingMove.scorePreview
  ) {
    return actionFailure("PROPOSAL_NOT_AVAILABLE", "noProposalToApprove");
  }

  const proposingPlayerId = state.turnState.proposingPlayerId;
  const unknownWords = pendingMove.wordResults
    .filter((result) => result.status === "UNKNOWN_WORD")
    .map((result) => result.normalizedWord);

  let history = state.history;
  if (unknownWords.length > 0) {
    history = addHistoryEvent(history, {
      id: createHistoryEventId(),
      sequence: nextSequence(history),
      type: "UNKNOWN_WORD_ACCEPTED",
      playerId: reviewingPlayerId,
      payload: { words: unknownWords },
    });
  }

  const stateBeforeCommit: GameState = { ...state, history };

  const acceptedWordsLanguage = configuration.modifiers.has("WILD")
    ? configuration.wildLanguages[
        activeWildLanguageIndex(state.history, configuration.wildLanguages.length)
      ]
    : undefined;

  const committed = commitMove(stateBeforeCommit, {
    playerId: proposingPlayerId,
    placedTiles: pendingMove.placedTiles,
    formedWords: pendingMove.formedWords,
    scoreResult: pendingMove.scorePreview,
    acceptedWords: unknownWords,
    acceptedWordsLanguage,
    usedUnknownWordApproval: true,
    rackSize: configuration.rackSize,
  });

  return { success: true, state: committed };
}
