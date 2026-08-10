import type { GameState } from "../model/game";
import type { GameError, GameErrorCode } from "../model/gameError";

export type { GameError, GameErrorCode } from "../model/gameError";

export type ActionResult =
  | { readonly success: true; readonly state: GameState }
  | { readonly success: false; readonly error: GameError };

export function actionFailure(
  code: GameErrorCode,
  messageKey: string,
): ActionResult {
  return { success: false, error: { code, messageKey } };
}
