import {
  createBoardDefinition,
  type BoardCellDefinition,
  type BoardDefinition,
} from "../../game/model/board";
import type { Coordinate } from "../../game/model/coordinate";

/**
 * Betapet's board: the standard 15x15 Scrabble board layout, adopted as the permanent Version 1
 * configuration (a real Alfapet board could not be verified). See docs/decisions.md DEC-001 and
 * DEC-009, and docs/game-rules.md section 3.
 */

const TRIPLE_WORD: readonly Coordinate[] = [
  { row: 0, column: 0 },
  { row: 0, column: 7 },
  { row: 0, column: 14 },
  { row: 7, column: 0 },
  { row: 7, column: 14 },
  { row: 14, column: 0 },
  { row: 14, column: 7 },
  { row: 14, column: 14 },
];

/** Includes the centre square, which scores as Word x2 in standard Scrabble rules. */
const DOUBLE_WORD: readonly Coordinate[] = [
  { row: 1, column: 1 },
  { row: 2, column: 2 },
  { row: 3, column: 3 },
  { row: 4, column: 4 },
  { row: 1, column: 13 },
  { row: 2, column: 12 },
  { row: 3, column: 11 },
  { row: 4, column: 10 },
  { row: 13, column: 1 },
  { row: 12, column: 2 },
  { row: 11, column: 3 },
  { row: 10, column: 4 },
  { row: 13, column: 13 },
  { row: 12, column: 12 },
  { row: 11, column: 11 },
  { row: 10, column: 10 },
  { row: 7, column: 7 },
];

const TRIPLE_LETTER: readonly Coordinate[] = [
  { row: 1, column: 5 },
  { row: 1, column: 9 },
  { row: 5, column: 1 },
  { row: 5, column: 5 },
  { row: 5, column: 9 },
  { row: 5, column: 13 },
  { row: 9, column: 1 },
  { row: 9, column: 5 },
  { row: 9, column: 9 },
  { row: 9, column: 13 },
  { row: 13, column: 5 },
  { row: 13, column: 9 },
];

const DOUBLE_LETTER: readonly Coordinate[] = [
  { row: 0, column: 3 },
  { row: 0, column: 11 },
  { row: 2, column: 6 },
  { row: 2, column: 8 },
  { row: 3, column: 0 },
  { row: 3, column: 7 },
  { row: 3, column: 14 },
  { row: 6, column: 2 },
  { row: 6, column: 6 },
  { row: 6, column: 8 },
  { row: 6, column: 12 },
  { row: 7, column: 3 },
  { row: 7, column: 11 },
  { row: 8, column: 2 },
  { row: 8, column: 6 },
  { row: 8, column: 8 },
  { row: 8, column: 12 },
  { row: 11, column: 0 },
  { row: 11, column: 7 },
  { row: 11, column: 14 },
  { row: 12, column: 6 },
  { row: 12, column: 8 },
  { row: 14, column: 3 },
  { row: 14, column: 11 },
];

const CELLS: readonly BoardCellDefinition[] = [
  ...TRIPLE_WORD.map((coordinate) => ({
    coordinate,
    multiplier: "WORD_X3" as const,
  })),
  ...DOUBLE_WORD.map((coordinate) => ({
    coordinate,
    multiplier: "WORD_X2" as const,
  })),
  ...TRIPLE_LETTER.map((coordinate) => ({
    coordinate,
    multiplier: "LETTER_X3" as const,
  })),
  ...DOUBLE_LETTER.map((coordinate) => ({
    coordinate,
    multiplier: "LETTER_X2" as const,
  })),
];

export const SCRABBLE_BOARD_DEFINITION: BoardDefinition = createBoardDefinition(
  15,
  15,
  { row: 7, column: 7 },
  CELLS,
);
