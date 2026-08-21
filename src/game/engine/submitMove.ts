import type { WordClassificationRules } from "../dictionary/classifyWord";
import { classifyWordAcrossLanguages } from "../dictionary/classifyWordAcrossLanguages";
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
import { activeWildLanguageIndex, hasCommittedMove } from "./wildRotation";

export interface SubmitMoveOptions {
  /**
   * Every selected language's classification rules, for Polyglot mode
   * (game-modifiers.md section 9) — a formed word is DICTIONARY_WORD if it matches *any* of
   * these. Required (with at least two entries, one per `configuration.polyglotLanguages`) when
   * `configuration.modifiers` has "POLYGLOT"; ignored otherwise, in which case the plain
   * `classificationRules` parameter alone is used, unchanged from before Polyglot existed.
   */
  readonly polyglotClassificationRules?: readonly WordClassificationRules[];
  /**
   * Every selected language's classification rules, for Wild mode (game-modifiers.md
   * section 10), in the same order as `configuration.wildLanguages` — exactly one of these is
   * used per move, chosen by `activeWildLanguageIndex`. Required, with exactly as many entries
   * as `configuration.wildLanguages`, when `configuration.modifiers` has "WILD"; ignored
   * otherwise.
   */
  readonly wildClassificationRules?: readonly WordClassificationRules[];
}

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
  options: SubmitMoveOptions = {},
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
    {
      allowMultiBranch: configuration.modifiers.has("CRISSCROSS"),
      isFirstMoveOverride: hasCommittedMove(state.history) ? false : undefined,
    },
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

  if (
    configuration.modifiers.has("POLYGLOT") &&
    (options.polyglotClassificationRules?.length ?? 0) < 2
  ) {
    throw new Error(
      "Polyglot mode requires at least two languages' classification rules " +
        "(configuration.polyglotLanguages, submitMove options.polyglotClassificationRules)",
    );
  }
  if (
    configuration.modifiers.has("WILD") &&
    options.wildClassificationRules?.length !== configuration.wildLanguages.length
  ) {
    throw new Error(
      "Wild mode requires exactly one classification-rules entry per " +
        "configuration.wildLanguages entry, in the same order " +
        "(submitMove options.wildClassificationRules)",
    );
  }
  const wildActiveIndex = configuration.modifiers.has("WILD")
    ? activeWildLanguageIndex(
        state.history,
        options.wildClassificationRules!.length,
      )
    : undefined;

  const languageRules = configuration.modifiers.has("POLYGLOT")
    ? options.polyglotClassificationRules!
    : wildActiveIndex !== undefined
      ? [options.wildClassificationRules![wildActiveIndex]]
      : [classificationRules];

  const acceptedSet =
    wildActiveIndex !== undefined
      ? acceptedVocabularySet(state, configuration.wildLanguages[wildActiveIndex])
      : acceptedVocabularySet(state);
  const wordResults = formedWords.map((word) =>
    classifyWordAcrossLanguages(word.text, languageRules, acceptedSet),
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

  if (configuration.modifiers.has("ILLEGAL")) {
    // game-modifiers.md section 8 / DEC-008: every formed word must be non-dictionary, not only
    // one of them — the whole move is blocked if any word is a real dictionary word.
    // ACCEPTED_IN_GAME words are unaffected (DEC-008): they're a distinct category, not folded
    // back into DICTIONARY_WORD once accepted.
    const dictionaryWord = wordResults.find(
      (result) => result.status === "DICTIONARY_WORD",
    );
    if (dictionaryWord) {
      return actionFailure(
        "DICTIONARY_WORD_NOT_ALLOWED",
        "dictionaryWordNotAllowed",
        { word: dictionaryWord.word },
      );
    }
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
    rackSize: configuration.rackSize,
  });

  return { success: true, state: committed };
}
