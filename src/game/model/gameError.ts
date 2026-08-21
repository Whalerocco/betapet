/** Not a closed set: more codes are added as later milestones add more actions/rules. */
export type GameErrorCode =
  | "GAME_NOT_ACTIVE"
  | "NOT_YOUR_TURN"
  | "INVALID_GAME_STATE"
  | "TILE_NOT_IN_RACK"
  | "INVALID_TILE"
  | "INVALID_PLACEMENT"
  | "NOT_CONNECTED_CLUSTER"
  | "BLANK_LETTER_REQUIRED"
  | "UNEXPECTED_BLANK_LETTER"
  | "INVALID_BLANK_LETTER"
  | "MOVE_NOT_CONNECTED"
  | "FIRST_MOVE_MUST_COVER_CENTER"
  | "INVALID_WORD"
  | "FORBIDDEN_WORD"
  | "PROPOSAL_NOT_AVAILABLE"
  | "PROPOSAL_ALREADY_CONFIRMED"
  | "NOT_AUTHORIZED_TO_APPROVE"
  | "EXCHANGE_NOT_ALLOWED"
  | "DICTIONARY_WORD_NOT_ALLOWED"
  | "REPLACE_CHAINING_NOT_ALLOWED"
  | "REPLACE_SAME_LETTER";

export interface GameError {
  readonly code: GameErrorCode;
  /** Presentation-layer lookup key; the engine never contains UI strings itself. */
  readonly messageKey: string;
  /** Structured extra data for the UI (e.g. which word was forbidden), never presentation text. */
  readonly details?: Record<string, unknown>;
}

export function createGameError(
  code: GameErrorCode,
  messageKey: string,
  details?: Record<string, unknown>,
): GameError {
  return { code, messageKey, details };
}
