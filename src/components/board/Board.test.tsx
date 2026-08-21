import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Board } from "./Board";
import {
  createBoardDefinition,
  createBoardState,
  placeCommittedTile,
} from "../../game/model/board";
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

describe("Board: Replace mode targets", () => {
  /** A board holding one committed "B" at the centre, plus whatever else the test needs. */
  function renderBoardWithCommittedTile(
    props: Partial<Parameters<typeof Board>[0]> = {},
  ) {
    const boardDefinition = testBoard();
    const tiles: Record<TileId, Tile> = {};
    const committedId = createTileId();
    tiles[committedId] = createLetterTile(committedId, "B", 1);
    const boardState = placeCommittedTile(
      createBoardState(),
      { row: 2, column: 2 },
      committedId,
    );

    render(
      <Board
        boardDefinition={boardDefinition}
        boardState={boardState}
        tiles={tiles}
        pendingPlacedTiles={[]}
        canPlaceSelectedTile={false}
        onPlaceAt={() => {}}
        onPendingTileClick={() => {}}
        {...props}
      />,
    );
    return { committedId, tiles };
  }

  it("leaves a committed tile inert when Replace mode is off", () => {
    renderBoardWithCommittedTile({ canPlaceSelectedTile: true });

    expect(screen.queryByLabelText("Ersätt bricka B")).not.toBeInTheDocument();
  });

  it("offers a committed tile as a placement target once a tile is selected", () => {
    const onPlaceAt = vi.fn();
    renderBoardWithCommittedTile({
      replaceModeActive: true,
      canPlaceSelectedTile: true,
      onPlaceAt,
    });

    fireEvent.click(screen.getByLabelText("Ersätt bricka B"));

    expect(onPlaceAt).toHaveBeenCalledWith({ row: 2, column: 2 });
  });

  it("offers no target while no tile is selected, even in Replace mode", () => {
    renderBoardWithCommittedTile({
      replaceModeActive: true,
      canPlaceSelectedTile: false,
    });

    expect(screen.queryByLabelText("Ersätt bricka B")).not.toBeInTheDocument();
  });

  it("never offers the player's own pending tile as a replace target", () => {
    const boardDefinition = testBoard();
    const tiles: Record<TileId, Tile> = {};
    const pendingId = createTileId();
    tiles[pendingId] = createLetterTile(pendingId, "B", 1);

    render(
      <Board
        boardDefinition={boardDefinition}
        boardState={createBoardState()}
        tiles={tiles}
        pendingPlacedTiles={[{ tileId: pendingId, coordinate: { row: 2, column: 2 } }]}
        canPlaceSelectedTile={true}
        replaceModeActive={true}
        onPlaceAt={() => {}}
        onPendingTileClick={() => {}}
      />,
    );

    expect(screen.queryByLabelText("Ersätt bricka B")).not.toBeInTheDocument();
    // It keeps its own "pick it back up" affordance instead.
    expect(
      screen.getByLabelText("Pending bricka B, tryck för att redigera"),
    ).toBeInTheDocument();
  });
});
