export interface Coordinate {
  readonly row: number;
  readonly column: number;
}

export type Orientation = "HORIZONTAL" | "VERTICAL";

export function coordinatesEqual(a: Coordinate, b: Coordinate): boolean {
  return a.row === b.row && a.column === b.column;
}

export function coordinateKey(coordinate: Coordinate): string {
  return `${coordinate.row},${coordinate.column}`;
}

/** Inverse of {@link coordinateKey}, used to read a coordinate back out of a DOM data attribute. */
export function parseCoordinateKey(key: string): Coordinate {
  const [row, column] = key.split(",").map(Number);
  return { row, column };
}

export function orthogonalNeighbors(
  coordinate: Coordinate,
): readonly Coordinate[] {
  return [
    { row: coordinate.row - 1, column: coordinate.column },
    { row: coordinate.row + 1, column: coordinate.column },
    { row: coordinate.row, column: coordinate.column - 1 },
    { row: coordinate.row, column: coordinate.column + 1 },
  ];
}
