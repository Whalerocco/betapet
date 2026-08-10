import type { GameState } from "../model/game";

/** Not a closed set: more codes are added as later milestones add more actions. */
export type GameErrorCode =
  | "GAME_NOT_ACTIVE"
  | "NOT_YOUR_TURN"
  | "INVALID_GAME_STATE"
  | "TILE_NOT_IN_RACK"
  | "INVALID_TILE"
  | "INVALID_PLACEMENT"
  | "BLANK_LETTER_REQUIRED"
  | "UNEXPECTED_BLANK_LETTER"
  | "INVALID_BLANK_LETTER";

export interface GameError {
  readonly code: GameErrorCode;
  /** Presentation-layer lookup key; the engine never contains UI strings itself. */
  readonly messageKey: string;
}

export type ActionResult =
  | { readonly success: true; readonly state: GameState }
  | { readonly success: false; readonly error: GameError };

export function actionFailure(
  code: GameErrorCode,
  messageKey: string,
): ActionResult {
  return { success: false, error: { code, messageKey } };
}
