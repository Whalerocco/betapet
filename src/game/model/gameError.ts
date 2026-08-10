/** Not a closed set: more codes are added as later milestones add more actions/rules. */
export type GameErrorCode =
  | "GAME_NOT_ACTIVE"
  | "NOT_YOUR_TURN"
  | "INVALID_GAME_STATE"
  | "TILE_NOT_IN_RACK"
  | "INVALID_TILE"
  | "INVALID_PLACEMENT"
  | "BLANK_LETTER_REQUIRED"
  | "UNEXPECTED_BLANK_LETTER"
  | "INVALID_BLANK_LETTER"
  | "MOVE_NOT_CONNECTED"
  | "FIRST_MOVE_MUST_COVER_CENTER";

export interface GameError {
  readonly code: GameErrorCode;
  /** Presentation-layer lookup key; the engine never contains UI strings itself. */
  readonly messageKey: string;
}

export function createGameError(
  code: GameErrorCode,
  messageKey: string,
): GameError {
  return { code, messageKey };
}
