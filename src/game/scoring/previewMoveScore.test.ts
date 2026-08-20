import { describe, expect, it } from "vitest";
import { createBoardDefinition, createBoardState } from "../model/board";
import { createTileId, type TileId } from "../model/ids";
import type { PendingPlacedTile } from "../model/pendingMove";
import { createLetterTile, type Tile } from "../model/tile";
import { previewMoveScore } from "./previewMoveScore";

function testBoard() {
  return createBoardDefinition(10, 10, { row: 5, column: 5 }, []);
}

function newLetter(
  tiles: Record<TileId, Tile>,
  row: number,
  column: number,
  letter: string,
  points: number,
): PendingPlacedTile {
  const tileId = createTileId();
  tiles[tileId] = createLetterTile(tileId, letter, points);
  return { tileId, coordinate: { row, column } };
}

describe("previewMoveScore", () => {
  it("returns the total score for a valid, word-forming placement", () => {
    const boardDefinition = testBoard();
    const boardState = createBoardState();
    const tiles: Record<TileId, Tile> = {};
    const placedTiles = [
      newLetter(tiles, 5, 5, "B", 1),
      newLetter(tiles, 5, 6, "I", 1),
      newLetter(tiles, 5, 7, "L", 1),
    ];

    const total = previewMoveScore(
      boardState,
      boardDefinition,
      tiles,
      placedTiles,
      7,
      {},
    );

    expect(total).toBe(3);
  });

  it("returns undefined for a placement that isn't physically valid yet (a gap)", () => {
    const boardDefinition = testBoard();
    const boardState = createBoardState();
    const tiles: Record<TileId, Tile> = {};
    const placedTiles = [
      newLetter(tiles, 5, 5, "B", 1),
      // Column 6 left empty: an illegal gap within the line.
      newLetter(tiles, 5, 7, "L", 1),
    ];

    const total = previewMoveScore(
      boardState,
      boardDefinition,
      tiles,
      placedTiles,
      7,
      {},
    );

    expect(total).toBeUndefined();
  });

  it("returns undefined for an empty placement", () => {
    const boardDefinition = testBoard();
    const boardState = createBoardState();

    const total = previewMoveScore(boardState, boardDefinition, {}, [], 7, {});

    expect(total).toBeUndefined();
  });
});
