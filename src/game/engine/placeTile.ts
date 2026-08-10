import {
  isOccupied,
  isWithinBounds,
  type BoardDefinition,
} from "../model/board";
import { coordinatesEqual, type Coordinate } from "../model/coordinate";
import { createGameState, type GameState } from "../model/game";
import type { PlayerId, TileId } from "../model/ids";
import type { Player } from "../model/player";
import {
  createPendingMove,
  type PendingPlacedTile,
} from "../model/pendingMove";
import { checkEditPreconditions } from "./actionPreconditions";
import { actionFailure, type ActionResult } from "./gameError";

export interface PlaceTileParams {
  readonly playerId: PlayerId;
  readonly tileId: TileId;
  readonly coordinate: Coordinate;
  /** Required if, and only if, the tile is a blank. */
  readonly representedLetter?: string;
}

/** Places a tile from the player's rack onto the board as part of the current pending move. */
export function placeTile(
  state: GameState,
  boardDefinition: BoardDefinition,
  alphabet: readonly string[],
  params: PlaceTileParams,
): ActionResult {
  const precondition = checkEditPreconditions(state, params.playerId);
  if (precondition) return { success: false, error: precondition };

  const player = state.players.find((p) => p.id === params.playerId);
  if (!player || !player.rack.tileIds.includes(params.tileId)) {
    return actionFailure("TILE_NOT_IN_RACK", "tileNotInRack");
  }

  const tile = state.tiles[params.tileId];
  if (tile.kind === "BLANK") {
    if (params.representedLetter === undefined) {
      return actionFailure("BLANK_LETTER_REQUIRED", "blankLetterRequired");
    }
    if (!alphabet.includes(params.representedLetter)) {
      return actionFailure("INVALID_BLANK_LETTER", "invalidBlankLetter");
    }
  } else if (params.representedLetter !== undefined) {
    return actionFailure("UNEXPECTED_BLANK_LETTER", "unexpectedBlankLetter");
  }

  if (!isWithinBounds(boardDefinition, params.coordinate)) {
    return actionFailure("INVALID_PLACEMENT", "invalidPlacement");
  }
  if (isOccupied(state.board, params.coordinate)) {
    return actionFailure("INVALID_PLACEMENT", "invalidPlacement");
  }
  const existingPlacedTiles = state.pendingMove?.placedTiles ?? [];
  if (
    existingPlacedTiles.some((p) =>
      coordinatesEqual(p.coordinate, params.coordinate),
    )
  ) {
    return actionFailure("INVALID_PLACEMENT", "invalidPlacement");
  }

  const newPlacedTile: PendingPlacedTile = {
    tileId: params.tileId,
    coordinate: params.coordinate,
    representedLetter: params.representedLetter,
  };
  const newPendingMove = createPendingMove(params.playerId, [
    ...existingPlacedTiles,
    newPlacedTile,
  ]);

  const updatedRack = {
    tileIds: player.rack.tileIds.filter((id) => id !== params.tileId),
  };
  const updatedPlayers = state.players.map((p) =>
    p.id === params.playerId ? { ...p, rack: updatedRack } : p,
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
