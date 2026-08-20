import { classifyWord, type WordClassificationRules } from "./classifyWord";
import type { WordValidationResult } from "../model/wordValidationResult";

/**
 * Polyglot mode (game-modifiers.md section 9): a word is treated as a standard dictionary word
 * if it is found in *any* of the selected languages' dictionaries. `dictionary.md`'s
 * classification is otherwise unchanged — it is simply evaluated once per language and combined.
 *
 * FORBIDDEN_WORD (word length) and ACCEPTED_IN_GAME (the shared, game-wide accepted-vocabulary
 * set, per DEC-010) are both language-independent checks inside `classifyWord`, so every
 * language's result agrees on those already; the only real combination decision is
 * DICTIONARY_WORD-in-any-language vs UNKNOWN_WORD-in-all. Priority order (first match wins)
 * mirrors `classifyWord`'s own internal precedence: FORBIDDEN_WORD, then ACCEPTED_IN_GAME, then
 * DICTIONARY_WORD, else UNKNOWN_WORD.
 *
 * Passing a single-element `rulesPerLanguage` array (the non-Polyglot case) is equivalent to
 * calling `classifyWord` directly — this lets `submitMove.ts` use one code path for both.
 */
export function classifyWordAcrossLanguages(
  word: string,
  rulesPerLanguage: readonly WordClassificationRules[],
  acceptedVocabulary: ReadonlySet<string> = new Set(),
): WordValidationResult {
  const results = rulesPerLanguage.map((rules) =>
    classifyWord(word, rules, acceptedVocabulary),
  );
  return (
    results.find((result) => result.status === "FORBIDDEN_WORD") ??
    results.find((result) => result.status === "ACCEPTED_IN_GAME") ??
    results.find((result) => result.status === "DICTIONARY_WORD") ??
    results[0]
  );
}
