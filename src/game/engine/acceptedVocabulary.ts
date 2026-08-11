import { normalizeWord } from "../dictionary/normalizeWord";
import { createGameState, type GameState } from "../model/game";

/**
 * Adds a normalized word to this game's accepted vocabulary (dictionary.md sections 23-24):
 * per-game state, never the global dictionary. A no-op if already present, since the same word
 * may be accepted and later reused without needing another approval (dictionary.md section 25).
 */
export function addAcceptedWord(state: GameState, word: string): GameState {
  const normalized = normalizeWord(word);
  if (state.acceptedVocabulary.includes(normalized)) {
    return state;
  }
  return createGameState({
    ...state,
    acceptedVocabulary: [...state.acceptedVocabulary, normalized],
  });
}

export function isAcceptedInGame(state: GameState, word: string): boolean {
  return state.acceptedVocabulary.includes(normalizeWord(word));
}

/** For passing into classifyWord, which takes a Set for efficient repeated lookups. */
export function acceptedVocabularySet(state: GameState): ReadonlySet<string> {
  return new Set(state.acceptedVocabulary);
}
