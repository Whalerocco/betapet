import {
  isOccupied,
  isWithinBounds,
  type BoardDefinition,
} from "../model/board";
import { coordinatesEqual, type Coordinate } from "../model/coordinate";
import { createGameState, type GameState } from "../model/game";
import type { PlayerId, TileId } from "../model/ids";
import { createPendingMove } from "../model/pendingMove";
import { checkEditPreconditions } from "./actionPreconditions";
import { actionFailure, type ActionResult } from "./gameError";

export interface MovePendingTileParams {
  readonly playerId: PlayerId;
  readonly tileId: TileId;
  readonly coordinate: Coordinate;
}

/** Moves an already-pending tile to a new empty coordinate, preserving its identity. */
export function movePendingTile(
  state: GameState,
  boardDefinition: BoardDefinition,
  params: MovePendingTileParams,
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

  if (!isWithinBounds(boardDefinition, params.coordinate)) {
    return actionFailure("INVALID_PLACEMENT", "invalidPlacement");
  }
  if (isOccupied(state.board, params.coordinate)) {
    return actionFailure("INVALID_PLACEMENT", "invalidPlacement");
  }
  const otherPlacedTiles = pendingMove.placedTiles.filter(
    (p) => p.tileId !== params.tileId,
  );
  if (
    otherPlacedTiles.some((p) =>
      coordinatesEqual(p.coordinate, params.coordinate),
    )
  ) {
    return actionFailure("INVALID_PLACEMENT", "invalidPlacement");
  }

  const movedTile = { ...placedTile, coordinate: params.coordinate };
  const newPendingMove = createPendingMove(params.playerId, [
    ...otherPlacedTiles,
    movedTile,
  ]);

  return {
    success: true,
    state: createGameState({ ...state, pendingMove: newPendingMove }),
  };
}
