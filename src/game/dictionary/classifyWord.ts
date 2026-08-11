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
 * minimum-length check, forbidden-category check, accepted-vocabulary check, dictionary
 * lookup. A dictionary word cannot be deliberately submitted as unknown (game-rules.md section
 * 19) — that constraint belongs to the proposal flow, not here; this function only reports what
 * a word *is*.
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

  const isExplicitlyAllowed =
    rules.allowedCountries.has(normalizedWord) ||
    rules.allowedMonths.has(normalizedWord) ||
    rules.allowedWeekdays.has(normalizedWord) ||
    rules.allowedAbbreviations.has(normalizedWord);

  if (!isExplicitlyAllowed) {
    if (rules.properNounOnly.has(normalizedWord)) {
      return {
        word,
        normalizedWord,
        status: "FORBIDDEN_WORD",
        reason: "PROPER_OR_PLACE_NAME",
      };
    }
    if (rules.abbreviationOnly.has(normalizedWord)) {
      return {
        word,
        normalizedWord,
        status: "FORBIDDEN_WORD",
        reason: "ABBREVIATION",
      };
    }
  }

  if (acceptedVocabulary.has(normalizedWord)) {
    return { word, normalizedWord, status: "ACCEPTED_IN_GAME" };
  }

  if (rules.dictionary.isWord(normalizedWord)) {
    return { word, normalizedWord, status: "DICTIONARY_WORD" };
  }

  return { word, normalizedWord, status: "UNKNOWN_WORD" };
}
