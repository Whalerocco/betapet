import {
  coordinatesEqual,
  orthogonalNeighbors,
  type Coordinate,
} from "../model/coordinate";
import {
  isOccupied,
  isWithinBounds,
  type BoardDefinition,
  type BoardState,
} from "../model/board";
import type { GameError, GameErrorCode } from "../model/gameError";
import {
  determinePlacementOrientation,
  type PendingPlacedTile,
} from "../model/pendingMove";

export type PhysicalValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly error: GameError };

function invalid(
  code: GameErrorCode,
  messageKey: string,
): PhysicalValidationResult {
  return { valid: false, error: { code, messageKey } };
}

/**
 * Validates a placement against the physical Alfapet placement rules (game-rules.md sections
 * 6-9), independently of word/dictionary validity: bounds, collisions, single-line alignment,
 * no illegal gaps, and either covering the centre square (first move) or connecting to the
 * existing board (subsequent moves).
 */
export function validatePhysicalPlacement(
  boardState: BoardState,
  boardDefinition: BoardDefinition,
  placedTiles: readonly PendingPlacedTile[],
): PhysicalValidationResult {
  if (placedTiles.length === 0) {
    return invalid("INVALID_PLACEMENT", "emptyPlacement");
  }

  for (const placed of placedTiles) {
    if (!isWithinBounds(boardDefinition, placed.coordinate)) {
      return invalid("INVALID_PLACEMENT", "outOfBounds");
    }
    if (isOccupied(boardState, placed.coordinate)) {
      return invalid("INVALID_PLACEMENT", "cellOccupied");
    }
  }

  const seenCoordinates = new Set<string>();
  for (const placed of placedTiles) {
    const key = `${placed.coordinate.row},${placed.coordinate.column}`;
    if (seenCoordinates.has(key)) {
      return invalid("INVALID_PLACEMENT", "duplicateCoordinate");
    }
    seenCoordinates.add(key);
  }

  const orientation = determinePlacementOrientation(placedTiles);
  if (placedTiles.length > 1 && !orientation) {
    return invalid("INVALID_PLACEMENT", "notInLine");
  }

  if (orientation) {
    const fixedAxis = orientation === "HORIZONTAL" ? "row" : "column";
    const varyingAxis = orientation === "HORIZONTAL" ? "column" : "row";
    const fixedValue = placedTiles[0].coordinate[fixedAxis];
    const varyingValues = placedTiles.map((p) => p.coordinate[varyingAxis]);
    const min = Math.min(...varyingValues);
    const max = Math.max(...varyingValues);

    for (let v = min; v <= max; v++) {
      const coordinate: Coordinate =
        orientation === "HORIZONTAL"
          ? { row: fixedValue, column: v }
          : { row: v, column: fixedValue };
      const isNewlyPlaced = placedTiles.some((p) =>
        coordinatesEqual(p.coordinate, coordinate),
      );
      if (!isNewlyPlaced && !isOccupied(boardState, coordinate)) {
        return invalid("INVALID_PLACEMENT", "illegalGap");
      }
    }
  }

  const isFirstMove = boardState.occupiedCells.length === 0;
  if (isFirstMove) {
    const coversCentre = placedTiles.some((p) =>
      coordinatesEqual(p.coordinate, boardDefinition.centreCoordinate),
    );
    if (!coversCentre) {
      return invalid(
        "FIRST_MOVE_MUST_COVER_CENTER",
        "firstMoveMustCoverCentre",
      );
    }
  } else {
    const isConnected = placedTiles.some((p) =>
      orthogonalNeighbors(p.coordinate).some((neighbour) =>
        isOccupied(boardState, neighbour),
      ),
    );
    if (!isConnected) {
      return invalid("MOVE_NOT_CONNECTED", "moveNotConnected");
    }
  }

  return { valid: true };
}
