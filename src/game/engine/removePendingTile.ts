import { createGameState, type GameState } from "../model/game";
import type { PlayerId, TileId } from "../model/ids";
import { createPendingMove } from "../model/pendingMove";
import { addTileToRack, type Player } from "../model/player";
import { checkEditPreconditions } from "./actionPreconditions";
import { actionFailure, type ActionResult } from "./gameError";

export interface RemovePendingTileParams {
  readonly playerId: PlayerId;
  readonly tileId: TileId;
}

/** Returns a pending tile to the player's rack. Clears the pending move once it is empty. */
export function removePendingTile(
  state: GameState,
  params: RemovePendingTileParams,
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

  const remainingPlacedTiles = pendingMove.placedTiles.filter(
    (p) => p.tileId !== params.tileId,
  );
  const newPendingMove =
    remainingPlacedTiles.length > 0
      ? createPendingMove(params.playerId, remainingPlacedTiles)
      : undefined;

  const updatedPlayers = state.players.map((p) =>
    p.id === params.playerId
      ? { ...p, rack: addTileToRack(p.rack, params.tileId) }
      : p,
  ) as [Player, Player];

  return {
    success: true,
    state: createGameState({
      ...state,
      players: updatedPlayers,
      pendingMove: newPendingMove,
    }),
  };
}
