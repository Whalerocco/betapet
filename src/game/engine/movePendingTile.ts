import {
  isOccupied,
  isWithinBounds,
  placeCommittedTile,
  type BoardDefinition,
  type BoardState,
} from "../model/board";
import { coordinatesEqual, type Coordinate } from "../model/coordinate";
import { createGameState, type GameState } from "../model/game";
import type { PlayerId, TileId } from "../model/ids";
import { createPendingMove } from "../model/pendingMove";
import { removeTileFromRack, type Player } from "../model/player";
import { checkEditPreconditions } from "./actionPreconditions";
import { actionFailure, type ActionResult } from "./gameError";

export interface MovePendingTileParams {
  readonly playerId: PlayerId;
  readonly tileId: TileId;
  readonly coordinate: Coordinate;
}

/**
 * Moves an already-pending tile to a new empty coordinate, preserving its identity. Only empty
 * targets are supported — moving a pending tile onto another committed tile (a second Replace)
 * is not implemented; use REMOVE_TILE followed by a fresh PLACE_TILE for that. If the tile being
 * moved was itself a Replace-mode placement (game-modifiers.md section 7) at its old coordinate,
 * that displacement is reversed first: the tile it had displaced returns to the board there, and
 * out of the rack, before the move proceeds — the destination is always an ordinary placement.
 */
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

  let board: BoardState = state.board;
  let players = state.players;
  if (placedTile.replacedTileId !== undefined) {
    board = placeCommittedTile(
      board,
      placedTile.coordinate,
      placedTile.replacedTileId,
    );
    players = players.map((p) =>
      p.id === params.playerId
        ? { ...p, rack: removeTileFromRack(p.rack, placedTile.replacedTileId!) }
        : p,
    ) as [Player, Player];
  }

  const movedTile = {
    ...placedTile,
    coordinate: params.coordinate,
    replacedTileId: undefined,
  };
  const newPendingMove = createPendingMove(params.playerId, [
    ...otherPlacedTiles,
    movedTile,
  ]);

  return {
    success: true,
    state: createGameState({
      ...state,
      board,
      players,
      pendingMove: newPendingMove,
    }),
  };
}
