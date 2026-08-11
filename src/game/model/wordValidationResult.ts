export type WordValidationStatus =
  "DICTIONARY_WORD" | "ACCEPTED_IN_GAME" | "UNKNOWN_WORD" | "FORBIDDEN_WORD";

/**
 * The sole reachable value as of DEC-007: proper names and non-standard abbreviations are
 * UNKNOWN_WORD (approvable), not FORBIDDEN_WORD, so they no longer need a reason here.
 */
export type WordValidationReason = "ONE_LETTER_WORD";

export interface WordValidationResult {
  readonly word: string;
  readonly normalizedWord: string;
  readonly status: WordValidationStatus;
  /** Present only for FORBIDDEN_WORD. */
  readonly reason?: WordValidationReason;
}
