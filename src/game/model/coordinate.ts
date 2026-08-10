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
