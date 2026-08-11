import { normalizeWord } from "./normalizeWord";

/**
 * The engine depends on this abstract interface, never a specific file format or library
 * (dictionary.md section 27, game-engine.md section 9).
 */
export interface Dictionary {
  isWord(word: string): boolean;
}

/** Builds a Dictionary from an already-normalized word list, using a set for O(1) lookup. */
export function createDictionary(
  normalizedWords: readonly string[],
): Dictionary {
  const words = new Set(normalizedWords);
  return {
    isWord(word: string): boolean {
      return words.has(normalizeWord(word));
    },
  };
}
