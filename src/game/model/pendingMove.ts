import type { Coordinate } from "./coordinate";
import { coordinateKey } from "./coordinate";
import type { PlayerId, TileId } from "./ids";

export interface PendingPlacedTile {
  readonly tileId: TileId;
  readonly coordinate: Coordinate;
  readonly representedLetter?: string;
}

export type PendingMoveStatus =
  | "EDITING"
  | "REQUIRES_PLAYER_CONFIRMATION"
  | "WAITING_FOR_OPPONENT"
  | "REJECTED";

export interface PendingMove {
  readonly playerId: PlayerId;
  readonly placedTiles: readonly PendingPlacedTile[];
  readonly status: PendingMoveStatus;
}

function assertNoDuplicatePlacements(
  placedTiles: readonly PendingPlacedTile[],
): void {
  const seenTileIds = new Set<TileId>();
  const seenCoordinates = new Set<string>();
  for (const placed of placedTiles) {
    if (seenTileIds.has(placed.tileId)) {
      throw new Error(
        `Tile ${placed.tileId} is placed more than once in the pending move`,
      );
    }
    seenTileIds.add(placed.tileId);

    const key = coordinateKey(placed.coordinate);
    if (seenCoordinates.has(key)) {
      throw new Error(`Coordinate ${key} has more than one pending tile`);
    }
    seenCoordinates.add(key);
  }
}

export function createPendingMove(
  playerId: PlayerId,
  placedTiles: readonly PendingPlacedTile[] = [],
): PendingMove {
  assertNoDuplicatePlacements(placedTiles);
  return { playerId, placedTiles, status: "EDITING" };
}
