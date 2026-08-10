import type { Coordinate } from "./coordinate";
import { coordinateKey } from "./coordinate";
import type { TileId } from "./ids";

export type Multiplier =
  | "NONE"
  | "LETTER_X2"
  | "LETTER_X3"
  | "LETTER_X4"
  | "LETTER_MINUS_X2"
  | "WORD_X2"
  | "WORD_X3"
  | "WORD_X4"
  | "START";

export interface BoardCellDefinition {
  readonly coordinate: Coordinate;
  readonly multiplier: Multiplier;
}

export interface BoardDefinition {
  readonly width: number;
  readonly height: number;
  readonly centreCoordinate: Coordinate;
  readonly cells: readonly BoardCellDefinition[];
}

export function isWithinBounds(
  definition: BoardDefinition,
  coordinate: Coordinate,
): boolean {
  return (
    coordinate.row >= 0 &&
    coordinate.row < definition.height &&
    coordinate.column >= 0 &&
    coordinate.column < definition.width
  );
}

export function createBoardDefinition(
  width: number,
  height: number,
  centreCoordinate: Coordinate,
  cells: readonly BoardCellDefinition[],
): BoardDefinition {
  if (!Number.isInteger(width) || width <= 0) {
    throw new Error(
      `Board width must be a positive integer, received ${width}`,
    );
  }
  if (!Number.isInteger(height) || height <= 0) {
    throw new Error(
      `Board height must be a positive integer, received ${height}`,
    );
  }

  const definition: BoardDefinition = {
    width,
    height,
    centreCoordinate,
    cells,
  };

  if (!isWithinBounds(definition, centreCoordinate)) {
    throw new Error("Centre coordinate must be within board bounds");
  }

  const seen = new Set<string>();
  for (const cell of cells) {
    if (!isWithinBounds(definition, cell.coordinate)) {
      throw new Error(
        `Cell coordinate ${coordinateKey(cell.coordinate)} is outside board bounds`,
      );
    }
    const key = coordinateKey(cell.coordinate);
    if (seen.has(key)) {
      throw new Error(`Duplicate cell definition at ${key}`);
    }
    seen.add(key);
  }

  return definition;
}

export function getMultiplierAt(
  definition: BoardDefinition,
  coordinate: Coordinate,
): Multiplier {
  const key = coordinateKey(coordinate);
  const cell = definition.cells.find(
    (c) => coordinateKey(c.coordinate) === key,
  );
  return cell?.multiplier ?? "NONE";
}

export interface OccupiedCell {
  readonly coordinate: Coordinate;
  readonly tileId: TileId;
}

export interface BoardState {
  readonly occupiedCells: readonly OccupiedCell[];
}

export function createBoardState(): BoardState {
  return { occupiedCells: [] };
}

export function getTileIdAt(
  state: BoardState,
  coordinate: Coordinate,
): TileId | undefined {
  const key = coordinateKey(coordinate);
  return state.occupiedCells.find(
    (cell) => coordinateKey(cell.coordinate) === key,
  )?.tileId;
}

export function isOccupied(state: BoardState, coordinate: Coordinate): boolean {
  return getTileIdAt(state, coordinate) !== undefined;
}

export function placeCommittedTile(
  state: BoardState,
  coordinate: Coordinate,
  tileId: TileId,
): BoardState {
  if (isOccupied(state, coordinate)) {
    throw new Error(`Cell ${coordinateKey(coordinate)} is already occupied`);
  }
  return { occupiedCells: [...state.occupiedCells, { coordinate, tileId }] };
}
