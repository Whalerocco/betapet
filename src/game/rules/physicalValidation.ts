import {
  coordinateKey,
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
 * A single connected component of occupied-after-this-move cells (existing board tiles plus the
 * pending placement) reached via 4-directional adjacency, using a coordinate-key visited set.
 * Two occupied cells separated by an empty gap are never adjacent, so this single walk both
 * rejects gaps within a line and — when called with a non-collinear cluster, as Crisscross mode
 * allows (game-modifiers.md section 6) — confirms every branch is reachable from every other
 * branch, without needing a separate check for each.
 */
function reachableOccupiedCoordinates(
  boardState: BoardState,
  placedTiles: readonly PendingPlacedTile[],
): ReadonlySet<string> {
  const placedKeys = new Set(placedTiles.map((p) => coordinateKey(p.coordinate)));
  const isOccupiedAfterMove = (coordinate: Coordinate): boolean =>
    placedKeys.has(coordinateKey(coordinate)) || isOccupied(boardState, coordinate);

  const visited = new Set<string>();
  const queue: Coordinate[] = [placedTiles[0].coordinate];
  visited.add(coordinateKey(placedTiles[0].coordinate));
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbour of orthogonalNeighbors(current)) {
      const key = coordinateKey(neighbour);
      if (visited.has(key) || !isOccupiedAfterMove(neighbour)) continue;
      visited.add(key);
      queue.push(neighbour);
    }
  }
  return visited;
}

export interface PhysicalValidationOptions {
  /**
   * Crisscross mode (game-modifiers.md section 6): allows a move's new tiles to span more than
   * one line, as long as every newly placed tile is connected — directly or transitively through
   * other new tiles or existing board tiles — into one cluster. Defaults to false (the standard
   * single-connected-line rule, game-rules.md section 8).
   */
  readonly allowMultiBranch?: boolean;
  /**
   * Overrides the default "boardState.occupiedCells.length === 0" inference for whether this is
   * the game's first move. Needed under Replace mode (game-modifiers.md section 7): replacing
   * the board's only remaining committed tile vacates it immediately at placement time
   * (placeTile.ts), which would otherwise make a genuinely later move look like the first one.
   * Pass `false` whenever any move has ever been committed in this game (state.history), however
   * few tiles the board currently happens to hold.
   */
  readonly isFirstMoveOverride?: boolean;
}

/**
 * Validates a placement against the physical Alfapet placement rules (game-rules.md sections
 * 6-9), independently of word/dictionary validity: bounds, collisions, single-line alignment (or
 * multi-branch connectivity under Crisscross mode), no illegal gaps, and either covering the
 * centre square (first move) or connecting to the existing board (subsequent moves).
 */
export function validatePhysicalPlacement(
  boardState: BoardState,
  boardDefinition: BoardDefinition,
  placedTiles: readonly PendingPlacedTile[],
  options: PhysicalValidationOptions = {},
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

  if (options.allowMultiBranch) {
    const reachable = reachableOccupiedCoordinates(boardState, placedTiles);
    const allConnected = placedTiles.every((p) =>
      reachable.has(coordinateKey(p.coordinate)),
    );
    if (!allConnected) {
      return invalid("INVALID_PLACEMENT", "notConnectedCluster");
    }
  } else {
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
  }

  const isFirstMove =
    options.isFirstMoveOverride ?? boardState.occupiedCells.length === 0;
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
    // A replace placement (game-modifiers.md section 7) counts as connected on its own: the
    // cell it occupies was already a legitimately connected part of the board before this move
    // vacated it (placeTile.ts), even if none of its neighbours currently happen to be occupied
    // — e.g. replacing the board's only remaining committed tile.
    const isConnected = placedTiles.some(
      (p) =>
        p.replacedTileId !== undefined ||
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
