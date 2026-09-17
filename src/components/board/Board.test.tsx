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
        pendingPlacedTiles={[{ tileId, coordinate: { row: 2, column: 2 } }]}
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

  it("offers the player's own pending tile as a swap target once a tile is selected (DEC-017)", () => {
    const onPlaceAt = vi.fn();
    const boardDefinition = testBoard();
    const tiles: Record<TileId, Tile> = {};
    const pendingId = createTileId();
    tiles[pendingId] = createLetterTile(pendingId, "B", 1);

    render(
      <Board
        boardDefinition={boardDefinition}
        boardState={createBoardState()}
        tiles={tiles}
        pendingPlacedTiles={[
          { tileId: pendingId, coordinate: { row: 2, column: 2 } },
        ]}
        canPlaceSelectedTile={true}
        onPlaceAt={onPlaceAt}
        onPendingTileClick={() => {}}
      />,
    );

    // No Replace modifier here: swapping your own unplayed tile works in every mode.
    fireEvent.click(screen.getByLabelText("Ersätt bricka B"));

    expect(onPlaceAt).toHaveBeenCalledWith({ row: 2, column: 2 });
  });

  it("keeps the pick-it-back-up tap on a pending tile while nothing is selected", () => {
    const onPlaceAt = vi.fn();
    const onPendingTileClick = vi.fn();
    const boardDefinition = testBoard();
    const tiles: Record<TileId, Tile> = {};
    const pendingId = createTileId();
    tiles[pendingId] = createLetterTile(pendingId, "B", 1);

    render(
      <Board
        boardDefinition={boardDefinition}
        boardState={createBoardState()}
        tiles={tiles}
        pendingPlacedTiles={[
          { tileId: pendingId, coordinate: { row: 2, column: 2 } },
        ]}
        canPlaceSelectedTile={false}
        replaceModeActive={true}
        onPlaceAt={onPlaceAt}
        onPendingTileClick={onPendingTileClick}
      />,
    );

    expect(screen.queryByLabelText("Ersätt bricka B")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByLabelText("Pending bricka B, tryck för att redigera"),
    );

    expect(onPendingTileClick).toHaveBeenCalledWith(pendingId);
    expect(onPlaceAt).not.toHaveBeenCalled();
  });
});

describe("Board: a move under review", () => {
  /** One pending "B" at the centre, rendered with whatever review state the test wants. */
  function renderPendingTile(props: Partial<Parameters<typeof Board>[0]> = {}) {
    const tiles: Record<TileId, Tile> = {};
    const pendingId = createTileId();
    tiles[pendingId] = createLetterTile(pendingId, "B", 1);

    const result = render(
      <Board
        boardDefinition={testBoard()}
        boardState={createBoardState()}
        tiles={tiles}
        pendingPlacedTiles={[
          { tileId: pendingId, coordinate: { row: 2, column: 2 } },
        ]}
        canPlaceSelectedTile={false}
        onPlaceAt={() => {}}
        onPendingTileClick={() => {}}
        {...props}
      />,
    );
    return { ...result, pendingId };
  }

  it("keeps the proposed tiles on the board, named as awaiting an answer", () => {
    renderPendingTile({ pendingMoveUnderReview: true });

    expect(screen.getByTestId("cell-2,2")).toHaveTextContent("B");
    expect(
      screen.getByLabelText("Föreslagen bricka B, väntar på svar"),
    ).toBeInTheDocument();
  });

  it("makes them inert: no pick-it-back-up tap and no drag", () => {
    const onPendingTileClick = vi.fn();
    const onPendingTilePointerDown = vi.fn();
    renderPendingTile({
      pendingMoveUnderReview: true,
      onPendingTileClick,
      onPendingTilePointerDown,
    });

    // Not a button at all while the decision is pending.
    expect(
      screen.queryByLabelText(/tryck för att redigera/),
    ).not.toBeInTheDocument();
    const tile = screen.getByLabelText("Föreslagen bricka B, väntar på svar");
    fireEvent.click(tile);
    fireEvent.pointerDown(tile);

    expect(onPendingTileClick).not.toHaveBeenCalled();
    expect(onPendingTilePointerDown).not.toHaveBeenCalled();
  });

  it("leaves an ordinary pending move editable", () => {
    const onPendingTileClick = vi.fn();
    const { pendingId } = renderPendingTile({ onPendingTileClick });

    fireEvent.click(
      screen.getByLabelText("Pending bricka B, tryck för att redigera"),
    );

    expect(onPendingTileClick).toHaveBeenCalledWith(pendingId);
  });
});

/*
 * The opponent's last move, marked on the board (DEC-037). The set is of tile *ids*: a marked
 * tile that is no longer on the board — displaced by a later Replace-mode move — must leave its
 * mark with it, rather than handing it to whatever tile stands on that square now.
 */
describe("Board last-move marks", () => {
  /** Two committed tiles side by side, only the first of which the opponent just played. */
  function boardWithTwoCommittedTiles() {
    const marked = createTileId();
    const older = createTileId();
    const tiles: Record<TileId, Tile> = {
      [marked]: createLetterTile(marked, "R", 1),
      [older]: createLetterTile(older, "S", 1),
    };
    let boardState = createBoardState();
    boardState = placeCommittedTile(boardState, { row: 2, column: 2 }, marked);
    boardState = placeCommittedTile(boardState, { row: 2, column: 3 }, older);
    return { marked, older, tiles, boardState };
  }

  function renderBoard(
    props: Partial<React.ComponentProps<typeof Board>> & {
      boardState: ReturnType<typeof createBoardState>;
      tiles: Record<TileId, Tile>;
    },
  ) {
    const { boardState, tiles, ...rest } = props;
    render(
      <Board
        boardDefinition={testBoard()}
        boardState={boardState}
        tiles={tiles}
        pendingPlacedTiles={[]}
        canPlaceSelectedTile={false}
        onPlaceAt={() => {}}
        onPendingTileClick={() => {}}
        {...rest}
      />,
    );
  }

  it("names the tiles the opponent just played, and leaves the others unnamed", () => {
    const { marked, tiles, boardState } = boardWithTwoCommittedTiles();

    renderBoard({ boardState, tiles, lastMoveTileIds: new Set([marked]) });

    // The state is in the accessible name as well as in the colour, which is the rule for every
    // tile state on this board (ui-design.md section 43).
    expect(
      screen.getByLabelText("Bricka R, 1 poäng, motståndarens senaste drag"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Bricka S/)).not.toBeInTheDocument();
  });

  it("marks nothing when a marked tile is no longer on the board", () => {
    const { older, tiles, boardState } = boardWithTwoCommittedTiles();
    const displaced = createTileId();
    tiles[displaced] = createLetterTile(displaced, "T", 1);

    // `displaced` was in the opponent's move but has since been replaced off the board.
    renderBoard({
      boardState,
      tiles,
      lastMoveTileIds: new Set([displaced]),
    });

    expect(
      screen.queryByLabelText(/motståndarens senaste drag/),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-2,3")).toHaveTextContent("S");
    expect(older).toBeDefined();
  });

  it("never marks a tile of the move in progress", () => {
    const pending = createTileId();
    const tiles: Record<TileId, Tile> = {
      [pending]: createLetterTile(pending, "N", 1),
    };

    render(
      <Board
        boardDefinition={testBoard()}
        boardState={createBoardState()}
        tiles={tiles}
        pendingPlacedTiles={[
          { tileId: pending, coordinate: { row: 2, column: 2 } },
        ]}
        canPlaceSelectedTile={false}
        onPlaceAt={() => {}}
        onPendingTileClick={() => {}}
        lastMoveTileIds={new Set([pending])}
      />,
    );

    expect(
      screen.getByLabelText("Pending bricka N, tryck för att redigera"),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/motståndarens senaste drag/),
    ).not.toBeInTheDocument();
  });

  it("keeps the mark in the name of a Replace-mode target, which has a label of its own", () => {
    const { marked, tiles, boardState } = boardWithTwoCommittedTiles();

    renderBoard({
      boardState,
      tiles,
      canPlaceSelectedTile: true,
      replaceModeActive: true,
      lastMoveTileIds: new Set([marked]),
    });

    expect(
      screen.getByLabelText("Ersätt bricka R, motståndarens senaste drag"),
    ).toBeInTheDocument();
  });
});
