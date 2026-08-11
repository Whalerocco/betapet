import type { WordValidationResult } from "../model/wordValidationResult";
import type { Dictionary } from "./dictionary";
import { normalizeWord } from "./normalizeWord";

export interface WordClassificationRules {
  readonly dictionary: Dictionary;
  readonly properNounOnly: ReadonlySet<string>;
  readonly abbreviationOnly: ReadonlySet<string>;
  readonly allowedCountries: ReadonlySet<string>;
  readonly allowedMonths: ReadonlySet<string>;
  readonly allowedWeekdays: ReadonlySet<string>;
  readonly allowedAbbreviations: ReadonlySet<string>;
}

/**
 * Classifies a single formed word, per the pipeline in dictionary.md section 28: normalize,
 * minimum-length check, accepted-vocabulary check, non-standard-category check, dictionary
 * lookup. A dictionary word cannot be deliberately submitted as unknown (game-rules.md section
 * 19) — that constraint belongs to the proposal flow, not here; this function only reports what
 * a word *is*.
 *
 * Per DEC-007, proper names, place names, and non-standard abbreviations are classified as
 * UNKNOWN_WORD rather than FORBIDDEN_WORD: they are not auto-accepted the way an ordinary
 * dictionary word is, but the proposing player may still attempt them and the opponent decides.
 * FORBIDDEN_WORD is reserved for the one-letter-word rule (a structural minimum-length
 * constraint, not a word-content judgment), which cannot be attempted at all.
 */
export function classifyWord(
  word: string,
  rules: WordClassificationRules,
  acceptedVocabulary: ReadonlySet<string> = new Set(),
): WordValidationResult {
  const normalizedWord = normalizeWord(word);

  if (normalizedWord.length < 2) {
    return {
      word,
      normalizedWord,
      status: "FORBIDDEN_WORD",
      reason: "ONE_LETTER_WORD",
    };
  }

  // Checked before the non-standard-category check below so a word already accepted this game
  // (dictionary.md section 25) doesn't need re-approval on reuse, even if it's also a proper
  // name or non-standard abbreviation.
  if (acceptedVocabulary.has(normalizedWord)) {
    return { word, normalizedWord, status: "ACCEPTED_IN_GAME" };
  }

  const isExplicitlyAllowed =
    rules.allowedCountries.has(normalizedWord) ||
    rules.allowedMonths.has(normalizedWord) ||
    rules.allowedWeekdays.has(normalizedWord) ||
    rules.allowedAbbreviations.has(normalizedWord);

  if (!isExplicitlyAllowed) {
    if (
      rules.properNounOnly.has(normalizedWord) ||
      rules.abbreviationOnly.has(normalizedWord)
    ) {
      return { word, normalizedWord, status: "UNKNOWN_WORD" };
    }
  }

  if (rules.dictionary.isWord(normalizedWord)) {
    return { word, normalizedWord, status: "DICTIONARY_WORD" };
  }

  return { word, normalizedWord, status: "UNKNOWN_WORD" };
}
