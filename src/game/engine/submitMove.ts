import type { WordClassificationRules } from "../dictionary/classifyWord";
import { classifyWord } from "../dictionary/classifyWord";
import type { GameConfiguration } from "../model/gameConfiguration";
import { createGameState, type GameState } from "../model/game";
import type { PlayerId } from "../model/ids";
import { withValidationResults } from "../model/pendingMove";
import { requiresPlayerConfirmation } from "../model/turnState";
import { validatePhysicalPlacement } from "../rules/physicalValidation";
import { detectFormedWords } from "../rules/wordDetection";
import { scoreMove } from "../scoring/scoreMove";
import { acceptedVocabularySet } from "./acceptedVocabulary";
import { checkEditPreconditions } from "./actionPreconditions";
import { commitMove } from "./commitMove";
import { actionFailure, type ActionResult } from "./gameError";

/**
 * Submits the current pending move (normal-move-example.md section 40's pipeline): action
 * validation, physical validation, word detection, word classification, scoring, then either
 * an atomic commit (every word DICTIONARY_WORD or ACCEPTED_IN_GAME) or a transition to
 * REQUIRES_PLAYER_CONFIRMATION (at least one UNKNOWN_WORD, none forbidden — the proposer
 * decides next via confirmProposal/cancelProposal). Any FORBIDDEN_WORD rejects the whole move;
 * opponent approval can never rescue a forbidden word. As of DEC-007, FORBIDDEN_WORD is reached
 * only via a one-letter crossing fragment — proper names and non-standard abbreviations are
 * UNKNOWN_WORD instead, so in practice almost every word reaches the proposal flow.
 */
export function submitMove(
  state: GameState,
  configuration: GameConfiguration,
  classificationRules: WordClassificationRules,
  playerId: PlayerId,
): ActionResult {
  const precondition = checkEditPreconditions(state, playerId);
  if (precondition) return { success: false, error: precondition };

  const pendingMove = state.pendingMove;
  if (
    !pendingMove ||
    pendingMove.playerId !== playerId ||
    pendingMove.placedTiles.length === 0
  ) {
    return actionFailure("INVALID_GAME_STATE", "noPendingMove");
  }

  const physical = validatePhysicalPlacement(
    state.board,
    configuration.boardDefinition,
    pendingMove.placedTiles,
  );
  if (!physical.valid) {
    return { success: false, error: physical.error };
  }

  const formedWords = detectFormedWords(
    state.board,
    state.tiles,
    pendingMove.placedTiles,
  );
  if (formedWords.length === 0) {
    return actionFailure("INVALID_WORD", "noWordFormed");
  }

  const acceptedSet = acceptedVocabularySet(state);
  const wordResults = formedWords.map((word) =>
    classifyWord(word.text, classificationRules, acceptedSet),
  );

  const forbidden = wordResults.find(
    (result) => result.status === "FORBIDDEN_WORD",
  );
  if (forbidden) {
    return actionFailure("FORBIDDEN_WORD", "forbiddenWord", {
      word: forbidden.word,
      reason: forbidden.reason,
    });
  }

  const scoreResult = scoreMove(
    configuration.boardDefinition,
    pendingMove.placedTiles,
    state.tiles,
    formedWords,
    configuration.rackSize,
  );

  const hasUnknownWord = wordResults.some(
    (result) => result.status === "UNKNOWN_WORD",
  );
  if (hasUnknownWord) {
    const updatedPendingMove = withValidationResults(
      pendingMove,
      "REQUIRES_PLAYER_CONFIRMATION",
      formedWords,
      wordResults,
      scoreResult,
    );
    return {
      success: true,
      state: createGameState({
        ...state,
        pendingMove: updatedPendingMove,
        turnState: requiresPlayerConfirmation(playerId),
      }),
    };
  }

  const committed = commitMove(state, {
    playerId,
    placedTiles: pendingMove.placedTiles,
    formedWords,
    scoreResult,
    acceptedWords: [],
    usedUnknownWordApproval: false,
  });

  return { success: true, state: committed };
}
