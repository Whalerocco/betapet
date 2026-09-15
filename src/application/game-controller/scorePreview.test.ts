import { describe, expect, it } from "vitest";

import {
  createBoardDefinition,
  createBoardState,
  placeCommittedTile,
} from "../../game/model/board";
import { addHistoryEvent, createGameHistory } from "../../game/model/history";
import {
  createHistoryEventId,
  createPlayerId,
  createTileId,
  type TileId,
} from "../../game/model/ids";
import type { PendingPlacedTile } from "../../game/model/pendingMove";
import { createLetterTile, type Tile } from "../../game/model/tile";
import { pendingMoveScorePreview } from "./scorePreview";

/** A plain 10x10 board with no multiplier squares, so scores are just letter values. */
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

function preview(
  placedTiles: readonly PendingPlacedTile[],
  tiles: Record<TileId, Tile>,
  overrides: Partial<Parameters<typeof pendingMoveScorePreview>[0]> = {},
) {
  return pendingMoveScorePreview({
    boardState: createBoardState(),
    boardDefinition: testBoard(),
    tiles,
    placedTiles,
    rackSize: 7,
    tilesLeftInRack: 4,
    crisscrossMode: false,
    history: createGameHistory(),
    ...overrides,
  });
}

describe("pendingMoveScorePreview", () => {
  it("scores a valid word-forming placement and anchors the badge on its first tile", () => {
    const tiles: Record<TileId, Tile> = {};
    const placedTiles = [
      newLetter(tiles, 5, 6, "I", 1),
      newLetter(tiles, 5, 5, "B", 1),
      newLetter(tiles, 5, 7, "L", 2),
    ];

    const { total, badgeCoordinate } = preview(placedTiles, tiles);

    expect(total).toBe(4);
    // Reading order, not placement order: the badge sits on the leftmost tile of the row.
    expect(badgeCoordinate).toEqual({ row: 5, column: 5 });
  });

  it("has nothing to preview before a tile is placed", () => {
    expect(preview([], {})).toEqual({});
  });

  it("keeps the badge coordinate but no score while the placement is not valid yet", () => {
    const tiles: Record<TileId, Tile> = {};
    const placedTiles = [
      newLetter(tiles, 5, 5, "B", 1),
      // Column 6 left empty: an illegal gap, so there is no coherent score to show.
      newLetter(tiles, 5, 7, "L", 1),
    ];

    const { total, badgeCoordinate } = preview(placedTiles, tiles);

    expect(total).toBeUndefined();
    expect(badgeCoordinate).toEqual({ row: 5, column: 5 });
  });

  it("passes Crisscross mode through, which decides whether two lines connect", () => {
    const tiles: Record<TileId, Tile> = {};
    let boardState = createBoardState();
    const committed = createTileId();
    tiles[committed] = createLetterTile(committed, "O", 1);
    boardState = placeCommittedTile(
      boardState,
      { row: 5, column: 5 },
      committed,
    );

    // Two separate two-letter lines, each touching the committed tile's row/column but not each
    // other's line except through it: standard rules refuse it, Crisscross allows it.
    const placedTiles = [
      newLetter(tiles, 5, 6, "S", 1),
      newLetter(tiles, 6, 5, "S", 1),
    ];

    expect(preview(placedTiles, tiles, { boardState }).total).toBeUndefined();
    expect(
      preview(placedTiles, tiles, { boardState, crisscrossMode: true }).total,
    ).toBe(4);
  });

  it("does not mistake a later move for the first one when the board has been emptied", () => {
    /*
     * Replace mode can vacate the board's last committed tile mid-move, which would otherwise
     * make a later move look like the first and demand the centre square
     * (physicalValidation.ts `isFirstMoveOverride`). The history is what settles it.
     */
    const tiles: Record<TileId, Tile> = {};
    const placedTiles = [
      newLetter(tiles, 5, 5, "B", 1),
      newLetter(tiles, 5, 6, "I", 1),
    ];
    const history = addHistoryEvent(createGameHistory(), {
      id: createHistoryEventId(),
      sequence: 0,
      type: "WORD_MOVE_COMMITTED",
      playerId: createPlayerId(),
      payload: {
        placedTiles: [],
        words: ["BI"],
        scoreAwarded: 2,
        usedUnknownWordApproval: false,
      },
    });

    // On the centre and touching nothing: that *is* a first move, and cannot be a later one.
    expect(preview(placedTiles, tiles).total).toBe(2);
    expect(preview(placedTiles, tiles, { history }).total).toBeUndefined();
  });

  it("awards the all-tiles bonus when the placement empties the hand", () => {
    const tiles: Record<TileId, Tile> = {};
    // Columns 3-9 of the centre row, so the line covers the centre square and stays in bounds.
    const placedTiles = Array.from({ length: 7 }, (_, i) =>
      newLetter(tiles, 5, 3 + i, "A", 1),
    );

    const { total } = preview(placedTiles, tiles, { tilesLeftInRack: 0 });

    expect(total).toBe(7 + 50);
  });
});
