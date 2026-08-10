import type { TileDefinition } from "../../game/model/tile";

/**
 * Interim substitute for the (unverified) physical Swedish Alfapet tile set: the standard
 * Swedish Scrabble letter distribution. See docs/decisions.md DEC-001 and docs/game-rules.md
 * section 4. Q and W are not part of the Swedish Scrabble set.
 */
export const SWEDISH_SCRABBLE_TILE_DEFINITIONS: readonly TileDefinition[] = [
  { kind: "LETTER", letter: "A", points: 1, count: 8 },
  { kind: "LETTER", letter: "B", points: 4, count: 2 },
  { kind: "LETTER", letter: "C", points: 8, count: 1 },
  { kind: "LETTER", letter: "D", points: 1, count: 5 },
  { kind: "LETTER", letter: "E", points: 1, count: 7 },
  { kind: "LETTER", letter: "F", points: 3, count: 2 },
  { kind: "LETTER", letter: "G", points: 2, count: 3 },
  { kind: "LETTER", letter: "H", points: 2, count: 2 },
  { kind: "LETTER", letter: "I", points: 1, count: 5 },
  { kind: "LETTER", letter: "J", points: 7, count: 1 },
  { kind: "LETTER", letter: "K", points: 2, count: 3 },
  { kind: "LETTER", letter: "L", points: 1, count: 5 },
  { kind: "LETTER", letter: "M", points: 2, count: 3 },
  { kind: "LETTER", letter: "N", points: 1, count: 6 },
  { kind: "LETTER", letter: "O", points: 2, count: 5 },
  { kind: "LETTER", letter: "P", points: 4, count: 2 },
  { kind: "LETTER", letter: "R", points: 1, count: 8 },
  { kind: "LETTER", letter: "S", points: 1, count: 8 },
  { kind: "LETTER", letter: "T", points: 1, count: 8 },
  { kind: "LETTER", letter: "U", points: 4, count: 3 },
  { kind: "LETTER", letter: "V", points: 3, count: 2 },
  { kind: "LETTER", letter: "X", points: 8, count: 1 },
  { kind: "LETTER", letter: "Y", points: 7, count: 1 },
  { kind: "LETTER", letter: "Z", points: 10, count: 1 },
  { kind: "LETTER", letter: "Ä", points: 3, count: 2 },
  { kind: "LETTER", letter: "Å", points: 4, count: 2 },
  { kind: "LETTER", letter: "Ö", points: 4, count: 2 },
  { kind: "BLANK", points: 0, count: 2 },
];
