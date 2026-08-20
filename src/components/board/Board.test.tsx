import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Board } from "./Board";
import { createBoardDefinition, createBoardState } from "../../game/model/board";
import { createTileId, type TileId } from "../../game/model/ids";
import { createLetterTile, type Tile } from "../../game/model/tile";

function testBoard() {
  return createBoardDefinition(5, 5, { row: 2, column: 2 }, []);
}

describe("Board score badge", () => {
  it("renders the total score on the pending move's first (reading-order) tile only", () => {
    const boardDefinition = testBoard();
    const boardState = createBoardState();
    const tiles: Record<TileId, Tile> = {};
    const firstId = createTileId();
    const secondId = createTileId();
    tiles[firstId] = createLetterTile(firstId, "B", 1);
    tiles[secondId] = createLetterTile(secondId, "I", 1);

    render(
      <Board
        boardDefinition={boardDefinition}
        boardState={boardState}
        tiles={tiles}
        pendingPlacedTiles={[
          { tileId: firstId, coordinate: { row: 2, column: 2 } },
          { tileId: secondId, coordinate: { row: 2, column: 3 } },
        ]}
        canPlaceSelectedTile={false}
        onPlaceAt={() => {}}
        onPendingTileClick={() => {}}
        scoreBadgeCoordinate={{ row: 2, column: 2 }}
        scoreBadgeValue={7}
      />,
    );

    const firstCell = screen.getByTestId("cell-2,2");
    expect(firstCell).toHaveTextContent("7");
    const secondCell = screen.getByTestId("cell-2,3");
    expect(secondCell).not.toHaveTextContent("7");
  });

  it("shows no badge when scoreBadgeValue is undefined", () => {
    const boardDefinition = testBoard();
    const boardState = createBoardState();
    const tiles: Record<TileId, Tile> = {};
    const tileId = createTileId();
    tiles[tileId] = createLetterTile(tileId, "B", 1);

    render(
      <Board
        boardDefinition={boardDefinition}
        boardState={boardState}
        tiles={tiles}
        pendingPlacedTiles={[
          { tileId, coordinate: { row: 2, column: 2 } },
        ]}
        canPlaceSelectedTile={false}
        onPlaceAt={() => {}}
        onPendingTileClick={() => {}}
        scoreBadgeCoordinate={{ row: 2, column: 2 }}
        scoreBadgeValue={undefined}
      />,
    );

    const cell = screen.getByTestId("cell-2,2");
    expect(cell).toHaveTextContent("B");
    // Just the tile's own letter + points spans — no extra badge span.
    expect(cell.querySelectorAll("span")).toHaveLength(2);
  });
});
