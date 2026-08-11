export type WordValidationStatus =
  "DICTIONARY_WORD" | "ACCEPTED_IN_GAME" | "UNKNOWN_WORD" | "FORBIDDEN_WORD";

export type WordValidationReason =
  "ONE_LETTER_WORD" | "PROPER_OR_PLACE_NAME" | "ABBREVIATION";

export interface WordValidationResult {
  readonly word: string;
  readonly normalizedWord: string;
  readonly status: WordValidationStatus;
  /** Present only for FORBIDDEN_WORD. */
  readonly reason?: WordValidationReason;
}
