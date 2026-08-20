import { normalizeWord } from "../dictionary/normalizeWord";
import { createGameState, type GameState } from "../model/game";
import type { LanguageCode } from "../model/language";

/**
 * Adds a normalized word to this game's accepted vocabulary (dictionary.md sections 23-24):
 * per-game state, never the global dictionary. `languageCode` scopes the acceptance to that one
 * Wild-mode language (DEC-012); omit it outside Wild mode. A no-op if this exact (word,
 * languageCode) pair is already present, since the same word may be accepted and later reused
 * without needing another approval (dictionary.md section 25).
 */
export function addAcceptedWord(
  state: GameState,
  word: string,
  languageCode?: LanguageCode,
): GameState {
  const normalized = normalizeWord(word);
  const alreadyAccepted = state.acceptedVocabulary.some(
    (entry) => entry.word === normalized && entry.languageCode === languageCode,
  );
  if (alreadyAccepted) {
    return state;
  }
  return createGameState({
    ...state,
    acceptedVocabulary: [
      ...state.acceptedVocabulary,
      { word: normalized, languageCode },
    ],
  });
}

export function isAcceptedInGame(
  state: GameState,
  word: string,
  languageCode?: LanguageCode,
): boolean {
  const normalized = normalizeWord(word);
  return state.acceptedVocabulary.some(
    (entry) =>
      entry.word === normalized &&
      (entry.languageCode === undefined || entry.languageCode === languageCode),
  );
}

/**
 * For passing into classifyWord, which takes a Set for efficient repeated lookups. Words
 * accepted outside Wild mode (`languageCode` undefined on the entry) are always included;
 * Wild-mode words are included only when they were accepted under the given `languageCode`
 * (DEC-012) — omit `languageCode` to get only the language-agnostic entries.
 */
export function acceptedVocabularySet(
  state: GameState,
  languageCode?: LanguageCode,
): ReadonlySet<string> {
  return new Set(
    state.acceptedVocabulary
      .filter(
        (entry) =>
          entry.languageCode === undefined || entry.languageCode === languageCode,
      )
      .map((entry) => entry.word),
  );
}
