import { createGameState, type GameState } from "../model/game";
import type { PlayerId, TileId } from "../model/ids";
import { createPendingMove } from "../model/pendingMove";
import { checkEditPreconditions } from "./actionPreconditions";
import { actionFailure, type ActionResult } from "./gameError";

export interface ChangeBlankRepresentedLetterParams {
  readonly playerId: PlayerId;
  readonly tileId: TileId;
  readonly representedLetter: string;
}

/** Changes the letter a pending blank tile represents. Only valid while the tile is pending. */
export function changeBlankRepresentedLetter(
  state: GameState,
  alphabet: readonly string[],
  params: ChangeBlankRepresentedLetterParams,
): ActionResult {
  const precondition = checkEditPreconditions(state, params.playerId);
  if (precondition) return { success: false, error: precondition };

  const pendingMove = state.pendingMove;
  if (!pendingMove || pendingMove.playerId !== params.playerId) {
    return actionFailure("INVALID_TILE", "tileNotPending");
  }
  const placedTile = pendingMove.placedTiles.find(
    (p) => p.tileId === params.tileId,
  );
  if (!placedTile) {
    return actionFailure("INVALID_TILE", "tileNotPending");
  }

  const tile = state.tiles[params.tileId];
  if (tile.kind !== "BLANK") {
    return actionFailure("INVALID_TILE", "tileNotBlank");
  }
  if (!alphabet.includes(params.representedLetter)) {
    return actionFailure("INVALID_BLANK_LETTER", "invalidBlankLetter");
  }

  const updatedPlacedTiles = pendingMove.placedTiles.map((p) =>
    p.tileId === params.tileId
      ? { ...p, representedLetter: params.representedLetter }
      : p,
  );
  const newPendingMove = createPendingMove(params.playerId, updatedPlacedTiles);

  return {
    success: true,
    state: createGameState({ ...state, pendingMove: newPendingMove }),
  };
}
