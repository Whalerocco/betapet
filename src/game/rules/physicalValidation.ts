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
 * The maximal contiguous run of occupied-after-this-move cells through `start` along one axis
 * (a row or a column) — the same "word line" a normal single-line move's gap check already walks,
 * mixing new and existing tiles freely. Undefined if `start` has no occupied neighbour on that
 * axis (not part of any 2+ letter line there).
 */
function occupiedRun(
  isOccupiedAfterMove: (coordinate: Coordinate) => boolean,
  start: Coordinate,
  axis: "row" | "column",
): ReadonlySet<string> | undefined {
  const step: Coordinate =
    axis === "row" ? { row: 0, column: 1 } : { row: 1, column: 0 };
  let begin = start;
  while (
    isOccupiedAfterMove({
      row: begin.row - step.row,
      column: begin.column - step.column,
    })
  ) {
    begin = { row: begin.row - step.row, column: begin.column - step.column };
  }
  const run = new Set<string>();
  for (
    let current = begin;
    isOccupiedAfterMove(current);
    current = {
      row: current.row + step.row,
      column: current.column + step.column,
    }
  ) {
    run.add(coordinateKey(current));
  }
  return run.size >= 2 ? run : undefined;
}

/** Repeatedly merges any two sets that share at least one element, until no pair does. */
function mergeSharedGroups(sets: readonly ReadonlySet<string>[]): Set<string>[] {
  const groups = sets.map((s) => new Set(s));
  let i = 0;
  while (i < groups.length) {
    const mergeIndex = groups.findIndex(
      (other, j) => j > i && [...groups[i]].some((key) => other.has(key)),
    );
    if (mergeIndex === -1) {
      i++;
    } else {
      for (const key of groups[mergeIndex]) groups[i].add(key);
      groups.splice(mergeIndex, 1);
    }
  }
  return groups;
}

/**
 * Crisscross mode (game-modifiers.md section 6) requires every newly placed tile to belong to a
 * 2+ letter line (row or column — new tiles plus any existing tiles filling gaps, exactly what a
 * normal move's single word already is), and requires those lines to all connect to each other by
 * sharing a cell, e.g. a T or plus shape where one line crosses another. This deliberately does
 * NOT treat two placed-tile groups as connected merely because each independently touches some
 * pre-existing tile elsewhere on the board — the newly placed tiles must connect to each other
 * directly, not only via a detour through unrelated parts of the existing board.
 */
function isCrisscrossConnected(
  boardState: BoardState,
  placedTiles: readonly PendingPlacedTile[],
): boolean {
  const placedKeys = new Set(placedTiles.map((p) => coordinateKey(p.coordinate)));
  const isOccupiedAfterMove = (coordinate: Coordinate): boolean =>
    placedKeys.has(coordinateKey(coordinate)) || isOccupied(boardState, coordinate);

  const runs: ReadonlySet<string>[] = [];
  for (const placed of placedTiles) {
    const horizontal = occupiedRun(isOccupiedAfterMove, placed.coordinate, "row");
    if (horizontal) runs.push(horizontal);
    const vertical = occupiedRun(isOccupiedAfterMove, placed.coordinate, "column");
    if (vertical) runs.push(vertical);
  }
  if (runs.length === 0) return false;

  const groups = mergeSharedGroups(runs);
  if (groups.length !== 1) return false;
  return placedTiles.every((p) => groups[0].has(coordinateKey(p.coordinate)));
}

export interface PhysicalValidationOptions {
  /**
   * Crisscross mode (game-modifiers.md section 6): allows a move's new tiles to span more than
   * one line, as long as every newly placed tile belongs to a 2+ letter line and those lines all
   * connect to each other by sharing a cell (see `isCrisscrossConnected`) — not merely by each
   * independently touching some unrelated pre-existing tile elsewhere on the board. Defaults to
   * false (the standard single-connected-line rule, game-rules.md section 8).
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
    if (!isCrisscrossConnected(boardState, placedTiles)) {
      return invalid("NOT_CONNECTED_CLUSTER", "notConnectedCluster");
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
