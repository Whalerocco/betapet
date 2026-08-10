import type { TileId } from "./ids";

export interface LetterTileDefinition {
  readonly kind: "LETTER";
  readonly letter: string;
  readonly points: number;
  readonly count: number;
}

export interface BlankTileDefinition {
  readonly kind: "BLANK";
  readonly points: 0;
  readonly count: number;
}

export type TileDefinition = LetterTileDefinition | BlankTileDefinition;

export interface LetterTile {
  readonly id: TileId;
  readonly kind: "LETTER";
  readonly letter: string;
  readonly points: number;
}

export interface BlankTile {
  readonly id: TileId;
  readonly kind: "BLANK";
  readonly points: 0;
  readonly representedLetter?: string;
}

export type Tile = LetterTile | BlankTile;

function assertValidLetter(letter: string): void {
  if (letter.length !== 1) {
    throw new Error(`Letter must be a single character, received "${letter}"`);
  }
}

function assertValidPoints(points: number): void {
  if (!Number.isInteger(points) || points < 0) {
    throw new Error(
      `Points must be a non-negative integer, received ${points}`,
    );
  }
}

export function createLetterTile(
  id: TileId,
  letter: string,
  points: number,
): LetterTile {
  assertValidLetter(letter);
  assertValidPoints(points);
  return { id, kind: "LETTER", letter, points };
}

export function createBlankTile(
  id: TileId,
  representedLetter?: string,
): BlankTile {
  if (representedLetter !== undefined) {
    assertValidLetter(representedLetter);
  }
  return { id, kind: "BLANK", points: 0, representedLetter };
}

export function withRepresentedLetter(
  tile: BlankTile,
  representedLetter: string,
): BlankTile {
  assertValidLetter(representedLetter);
  return { ...tile, representedLetter };
}

export function tileLetter(tile: Tile): string | undefined {
  return tile.kind === "LETTER" ? tile.letter : tile.representedLetter;
}
