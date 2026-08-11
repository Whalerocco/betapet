import { describe, expect, it } from "vitest";
import {
  createBoardDefinition,
  type BoardCellDefinition,
} from "../model/board";
import type { FormedWord } from "../model/formedWord";
import { createTileId, type TileId } from "../model/ids";
import type { PendingPlacedTile } from "../model/pendingMove";
import { createBlankTile, createLetterTile, type Tile } from "../model/tile";
import { scoreMove, scoreWord } from "./scoreMove";

function testBoard(cells: BoardCellDefinition[] = []) {
  return createBoardDefinition(10, 10, { row: 5, column: 5 }, cells);
}

/** A newly placed letter tile, registered in `tiles`. */
function newLetter(
  tiles: Record<TileId, Tile>,
  row: number,
  column: number,
  letter: string,
  points: number,
): { placed: PendingPlacedTile; tileId: TileId } {
  const tileId = createTileId();
  tiles[tileId] = createLetterTile(tileId, letter, points);
  return { placed: { tileId, coordinate: { row, column } }, tileId };
}

function newBlank(
  tiles: Record<TileId, Tile>,
  row: number,
  column: number,
  representedLetter: string,
): { placed: PendingPlacedTile; tileId: TileId } {
  const tileId = createTileId();
  tiles[tileId] = createBlankTile(tileId);
  return {
    placed: { tileId, coordinate: { row, column }, representedLetter },
    tileId,
  };
}

function word(
  text: string,
  tileIds: TileId[],
  coordinates: { row: number; column: number }[],
) {
  return {
    text,
    orientation: "HORIZONTAL",
    coordinates,
    tileIds,
  } as FormedWord;
}

describe("scoreWord", () => {
  it("scores a plain word with no multipliers", () => {
    const tiles: Record<TileId, Tile> = {};
    const a = newLetter(tiles, 0, 0, "K", 3);
    const b = newLetter(tiles, 0, 1, "A", 1);
    const c = newLetter(tiles, 0, 2, "T", 1);
    const placedTiles = [a.placed, b.placed, c.placed];
    const formedWord = word(
      "KAT",
      [a.tileId, b.tileId, c.tileId],
      [a.placed.coordinate, b.placed.coordinate, c.placed.coordinate],
    );

    const result = scoreWord(testBoard(), placedTiles, tiles, formedWord);

    expect(result.total).toBe(5);
    expect(result.wordMultiplier).toBe(1);
  });

  it("applies a letter multiplier only to the covered tile", () => {
    const tiles: Record<TileId, Tile> = {};
    const a = newLetter(tiles, 0, 0, "A", 1);
    const b = newLetter(tiles, 0, 1, "B", 4);
    const placedTiles = [a.placed, b.placed];
    const board = testBoard([
      { coordinate: { row: 0, column: 1 }, multiplier: "LETTER_X2" },
    ]);
    const formedWord = word(
      "AB",
      [a.tileId, b.tileId],
      [a.placed.coordinate, b.placed.coordinate],
    );

    const result = scoreWord(board, placedTiles, tiles, formedWord);

    // A contributes 1, B contributes 4 x 2 = 8.
    expect(result.total).toBe(9);
  });

  it("applies a word multiplier after letter points are summed", () => {
    const tiles: Record<TileId, Tile> = {};
    const a = newLetter(tiles, 0, 0, "A", 1);
    const b = newLetter(tiles, 0, 1, "B", 4);
    const c = newLetter(tiles, 0, 2, "C", 8);
    const placedTiles = [a.placed, b.placed, c.placed];
    const board = testBoard([
      { coordinate: { row: 0, column: 2 }, multiplier: "WORD_X3" },
    ]);
    const formedWord = word(
      "ABC",
      [a.tileId, b.tileId, c.tileId],
      [a.placed.coordinate, b.placed.coordinate, c.placed.coordinate],
    );

    const result = scoreWord(board, placedTiles, tiles, formedWord);

    // (1 + 4 + 8) x 3 = 39.
    expect(result.total).toBe(39);
    expect(result.wordMultiplier).toBe(3);
  });

  it("combines a letter multiplier and a word multiplier in the same word", () => {
    const tiles: Record<TileId, Tile> = {};
    const a = newLetter(tiles, 0, 0, "A", 1);
    const b = newLetter(tiles, 0, 1, "B", 4);
    const c = newLetter(tiles, 0, 2, "C", 8);
    const placedTiles = [a.placed, b.placed, c.placed];
    const board = testBoard([
      { coordinate: { row: 0, column: 1 }, multiplier: "LETTER_X2" },
      { coordinate: { row: 0, column: 2 }, multiplier: "WORD_X2" },
    ]);
    const formedWord = word(
      "ABC",
      [a.tileId, b.tileId, c.tileId],
      [a.placed.coordinate, b.placed.coordinate, c.placed.coordinate],
    );

    const result = scoreWord(board, placedTiles, tiles, formedWord);

    // (1 + 4x2 + 8) x 2 = 34.
    expect(result.total).toBe(34);
  });

  it("applies the Alfapet letter x-2 square: doubled and subtracted", () => {
    const tiles: Record<TileId, Tile> = {};
    const a = newLetter(tiles, 0, 0, "A", 1);
    const b = newLetter(tiles, 0, 1, "B", 4);
    const placedTiles = [a.placed, b.placed];
    const board = testBoard([
      { coordinate: { row: 0, column: 1 }, multiplier: "LETTER_MINUS_X2" },
    ]);
    const formedWord = word(
      "AB",
      [a.tileId, b.tileId],
      [a.placed.coordinate, b.placed.coordinate],
    );

    const result = scoreWord(board, placedTiles, tiles, formedWord);

    // A contributes 1; B contributes -(4 x 2) = -8. Total = 1 - 8 = -7.
    expect(result.total).toBe(-7);
  });

  it("scores a blank as zero even on a letter multiplier square", () => {
    const tiles: Record<TileId, Tile> = {};
    const a = newLetter(tiles, 0, 0, "A", 1);
    const blank = newBlank(tiles, 0, 1, "Z");
    const placedTiles = [a.placed, blank.placed];
    const board = testBoard([
      { coordinate: { row: 0, column: 1 }, multiplier: "LETTER_X3" },
    ]);
    const formedWord = word(
      "AZ",
      [a.tileId, blank.tileId],
      [a.placed.coordinate, blank.placed.coordinate],
    );

    const result = scoreWord(board, placedTiles, tiles, formedWord);

    expect(result.total).toBe(1);
  });

  it("does not activate a multiplier for a tile that was not newly placed", () => {
    const tiles: Record<TileId, Tile> = {};
    // Tile "existing" sits on a Letter x3 square but was placed in an earlier move.
    const existingTileId = createTileId();
    tiles[existingTileId] = createLetterTile(existingTileId, "A", 1);
    const b = newLetter(tiles, 0, 1, "B", 4);
    const placedTiles = [b.placed]; // only B is newly placed this move
    const board = testBoard([
      { coordinate: { row: 0, column: 0 }, multiplier: "LETTER_X3" },
    ]);
    const formedWord = word(
      "AB",
      [existingTileId, b.tileId],
      [{ row: 0, column: 0 }, b.placed.coordinate],
    );

    const result = scoreWord(board, placedTiles, tiles, formedWord);

    // Existing A contributes its raw 1 point, not 1 x 3, since it wasn't placed this move.
    expect(result.total).toBe(5);
  });
});

describe("scoreMove", () => {
  it("sums independently scored crossing words, including a shared multiplier tile in both", () => {
    const tiles: Record<TileId, Tile> = {};
    const a = newLetter(tiles, 1, 0, "A", 1);
    const b = newLetter(tiles, 1, 1, "B", 4);
    const c = newLetter(tiles, 2, 1, "C", 8);
    const placedTiles = [a.placed, b.placed, c.placed];
    const board = testBoard([
      { coordinate: { row: 1, column: 1 }, multiplier: "LETTER_X2" },
    ]);

    const mainWord = word(
      "AB",
      [a.tileId, b.tileId],
      [a.placed.coordinate, b.placed.coordinate],
    );
    const crossingWord = {
      text: "BC",
      orientation: "VERTICAL",
      tileIds: [b.tileId, c.tileId],
      coordinates: [b.placed.coordinate, c.placed.coordinate],
    } as FormedWord;

    const result = scoreMove(
      board,
      placedTiles,
      tiles,
      [mainWord, crossingWord],
      7,
    );

    // Main "AB": 1 + 4x2 = 9. Crossing "BC": 4x2 + 8 = 16. Total (no bonus, only 3 tiles): 25.
    expect(result.wordScores.map((w) => w.total)).toEqual([9, 16]);
    expect(result.total).toBe(25);
    expect(result.allTilesBonus).toBe(0);
  });

  it("awards the all-tiles bonus when the placement equals the configured rack size", () => {
    const tiles: Record<TileId, Tile> = {};
    const letters = ["K", "A", "T", "T", "O", "R", "N"];
    const placedTiles = letters.map(
      (letter, index) => newLetter(tiles, 0, index, letter, 1).placed,
    );
    const formedWord = word(
      "KATTORN",
      placedTiles.map((p) => p.tileId),
      placedTiles.map((p) => p.coordinate),
    );

    const result = scoreMove(testBoard(), placedTiles, tiles, [formedWord], 7);

    expect(result.allTilesBonus).toBe(50);
    expect(result.total).toBe(7 + 50);
  });

  it("does not award the all-tiles bonus for a smaller placement, even from a depleted rack", () => {
    const tiles: Record<TileId, Tile> = {};
    const a = newLetter(tiles, 0, 0, "A", 1);
    const b = newLetter(tiles, 0, 1, "B", 4);
    const placedTiles = [a.placed, b.placed];
    const formedWord = word(
      "AB",
      [a.tileId, b.tileId],
      [a.placed.coordinate, b.placed.coordinate],
    );

    // Configured rack size is 7, but only 2 tiles were placed (e.g. the bag ran low).
    const result = scoreMove(testBoard(), placedTiles, tiles, [formedWord], 7);

    expect(result.allTilesBonus).toBe(0);
    expect(result.total).toBe(5);
  });
});
