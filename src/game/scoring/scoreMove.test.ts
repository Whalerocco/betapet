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
      4,
    );

    // Main "AB": 1 + 4x2 = 9. Crossing "BC": 4x2 + 8 = 16. Total (no bonus, only 3 tiles): 25.
    expect(result.wordScores.map((w) => w.total)).toEqual([9, 16]);
    expect(result.total).toBe(25);
    expect(result.allTilesBonus).toBe(0);
  });

  it("awards the all-tiles bonus for emptying a full rack in one move", () => {
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

    const result = scoreMove(
      testBoard(),
      placedTiles,
      tiles,
      [formedWord],
      7,
      0,
    );

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

    // The rack held only these 2 tiles and is now empty, but emptying a depleted rack does not
    // qualify for the seven-tile bonus (game-rules.md section 25's own example).
    const result = scoreMove(
      testBoard(),
      placedTiles,
      tiles,
      [formedWord],
      7,
      0,
    );

    expect(result.allTilesBonus).toBe(0);
    expect(result.total).toBe(5);
  });
});

describe("scoreMove: the all-tiles bonus with a Replace-inflated hand (DEC-018)", () => {
  /**
   * Replace mode puts a displaced tile into the replacing player's own rack, so a hand can hold
   * more than the configured rack size. The project owner hit both halves of this during the
   * Version 1 hot-seat test: playing 6 of 7 held tiles scored *more* than playing all 7, because
   * the bonus used to key on the placed count matching the rack size.
   */
  function placement(count: number) {
    const tiles: Record<TileId, Tile> = {};
    const placedTiles = Array.from(
      { length: count },
      (_, index) => newLetter(tiles, 0, index, "A", 1).placed,
    );
    const formedWord = word(
      "A".repeat(count),
      placedTiles.map((p) => p.tileId),
      placedTiles.map((p) => p.coordinate),
    );
    return { tiles, placedTiles, formedWord };
  }

  it("awards it for emptying a hand grown past the rack size", () => {
    const { tiles, placedTiles, formedWord } = placement(7);

    // Rack size 6, but a displaced tile made the hand 7; all 7 are placed, so nothing is left.
    const result = scoreMove(
      testBoard(),
      placedTiles,
      tiles,
      [formedWord],
      6,
      0,
    );

    expect(result.allTilesBonus).toBe(40);
  });

  it("withholds it when a tile is left in hand, even at exactly a rack's worth", () => {
    const { tiles, placedTiles, formedWord } = placement(6);

    // The same hand of 7, but only 6 placed: one tile remains, so the hand was not emptied.
    const result = scoreMove(
      testBoard(),
      placedTiles,
      tiles,
      [formedWord],
      6,
      1,
    );

    expect(result.allTilesBonus).toBe(0);
  });

  it("scores a rack-emptying move at least as high as holding one back", () => {
    const all = placement(7);
    const heldBack = placement(6);

    const playedEverything = scoreMove(
      testBoard(),
      all.placedTiles,
      all.tiles,
      [all.formedWord],
      6,
      0,
    );
    const keptOne = scoreMove(
      testBoard(),
      heldBack.placedTiles,
      heldBack.tiles,
      [heldBack.formedWord],
      6,
      1,
    );

    // The whole point of the correction: playing more of your hand can never score less.
    expect(playedEverything.total).toBeGreaterThan(keptOne.total);
  });
});

describe("scoreWord: Replace mode does not reactivate a cell's multiplier", () => {
  it("scores a replace placement at plain letter value, ignoring the cell's letter multiplier", () => {
    const tiles: Record<TileId, Tile> = {};
    const a = newLetter(tiles, 0, 0, "A", 1);
    const b = newLetter(tiles, 0, 1, "B", 4);
    // B replaces an earlier tile at a LETTER_X2 square — that multiplier was already spent.
    const replacedTile: PendingPlacedTile = {
      ...b.placed,
      replacedTileId: createTileId(),
    };
    const placedTiles = [a.placed, replacedTile];
    const board = testBoard([
      { coordinate: { row: 0, column: 1 }, multiplier: "LETTER_X2" },
    ]);
    const formedWord = word(
      "AB",
      [a.tileId, b.tileId],
      [a.placed.coordinate, b.placed.coordinate],
    );

    const result = scoreWord(board, placedTiles, tiles, formedWord);

    // Without the fix this would be 1 + (4 x 2) = 9, matching the ordinary-placement test above.
    expect(result.total).toBe(1 + 4);
  });

  it("still applies the multiplier for a genuinely new placement in the same word as a replace", () => {
    const tiles: Record<TileId, Tile> = {};
    const a = newLetter(tiles, 0, 0, "A", 1);
    const b = newLetter(tiles, 0, 1, "B", 4);
    const c = newLetter(tiles, 0, 2, "C", 8);
    const replacedB: PendingPlacedTile = {
      ...b.placed,
      replacedTileId: createTileId(),
    };
    const placedTiles = [a.placed, replacedB, c.placed];
    const board = testBoard([
      { coordinate: { row: 0, column: 1 }, multiplier: "LETTER_X2" },
      { coordinate: { row: 0, column: 2 }, multiplier: "WORD_X3" },
    ]);
    const formedWord = word(
      "ABC",
      [a.tileId, b.tileId, c.tileId],
      [a.placed.coordinate, b.placed.coordinate, c.placed.coordinate],
    );

    const result = scoreWord(board, placedTiles, tiles, formedWord);

    // B's LETTER_X2 is suppressed (a replace), but C's WORD_X3 still applies (a genuinely new
    // placement): (1 + 4 + 8) x 3 = 39, same as the equivalent non-replace test above.
    expect(result.total).toBe(39);
    expect(result.wordMultiplier).toBe(3);
  });
});

/** An already-committed tile: registered in `tiles`, but not part of the pending move. */
function existingLetter(
  tiles: Record<TileId, Tile>,
  letter: string,
  points: number,
): TileId {
  const tileId = createTileId();
  tiles[tileId] = createLetterTile(tileId, letter, points);
  return tileId;
}

describe("scoreWord: Replace mode only scores a word the move lengthened (DEC-016)", () => {
  it("scores nothing for a word the move only re-lettered", () => {
    const tiles: Record<TileId, Tile> = {};
    const b = existingLetter(tiles, "B", 4);
    const l = existingLetter(tiles, "L", 2);
    // "A" replaces the middle tile of the committed word "BIL", making it "BAL" — same length.
    const a = newLetter(tiles, 0, 1, "A", 1);
    const replacedA: PendingPlacedTile = {
      ...a.placed,
      replacedTileId: createTileId(),
    };
    const formedWord = word(
      "BAL",
      [b, a.tileId, l],
      [
        { row: 0, column: 0 },
        { row: 0, column: 1 },
        { row: 0, column: 2 },
      ],
    );

    const result = scoreWord(testBoard(), [replacedA], tiles, formedWord);

    expect(result.scoresPoints).toBe(false);
    expect(result.total).toBe(0);
    // The breakdown is still reported, so a UI can show what it would otherwise have been worth.
    expect(result.letterScores).toHaveLength(3);
  });

  it("scores the whole word, replaced tile included, once the move also lengthens it", () => {
    const tiles: Record<TileId, Tile> = {};
    const b = existingLetter(tiles, "B", 4);
    const l = existingLetter(tiles, "L", 2);
    const a = newLetter(tiles, 0, 1, "A", 1);
    const replacedA: PendingPlacedTile = {
      ...a.placed,
      replacedTileId: createTileId(),
    };
    // A second "A" extends "BAL" to "BALA" on a previously empty cell.
    const extension = newLetter(tiles, 0, 3, "A", 1);
    const formedWord = word(
      "BALA",
      [b, a.tileId, l, extension.tileId],
      [
        { row: 0, column: 0 },
        { row: 0, column: 1 },
        { row: 0, column: 2 },
        { row: 0, column: 3 },
      ],
    );

    const result = scoreWord(
      testBoard(),
      [replacedA, extension.placed],
      tiles,
      formedWord,
    );

    expect(result.scoresPoints).toBe(true);
    expect(result.total).toBe(4 + 1 + 2 + 1);
  });

  it("still awards the all-tiles bonus when every word it touched scored nothing", () => {
    const tiles: Record<TileId, Tile> = {};
    const existing = Array.from({ length: 8 }, () =>
      existingLetter(tiles, "X", 1),
    );
    // Seven tiles, every one of them a replace inside an existing eight-letter word: the word
    // scores nothing, but the rack was still emptied, which is what the bonus is for.
    const placedTiles: PendingPlacedTile[] = [];
    const tileIds: TileId[] = [existing[0]];
    const coordinates = [{ row: 0, column: 0 }];
    for (let column = 1; column <= 7; column++) {
      const tile = newLetter(tiles, 0, column, "A", 1);
      placedTiles.push({ ...tile.placed, replacedTileId: existing[column] });
      tileIds.push(tile.tileId);
      coordinates.push({ row: 0, column });
    }
    const formedWord = word("XAAAAAAA", tileIds, coordinates);

    const result = scoreMove(
      testBoard(),
      placedTiles,
      tiles,
      [formedWord],
      7,
      0,
    );

    expect(result.wordScores[0].total).toBe(0);
    expect(result.allTilesBonus).toBeGreaterThan(0);
    expect(result.total).toBe(result.allTilesBonus);
  });
});
