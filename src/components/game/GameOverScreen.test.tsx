import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createBoardDefinition,
  createBoardState,
  placeCommittedTile,
} from "../../game/model/board";
import { createGameHistory } from "../../game/model/history";
import { createGameResult } from "../../game/model/gameResult";
import {
  createPlayerId,
  createTileId,
  type TileId,
} from "../../game/model/ids";
import { createLetterTile, type Tile } from "../../game/model/tile";
import { GameOverScreen } from "./GameOverScreen";

/** A small finished board holding one committed tile, so the final position has something on it. */
function finishedBoard() {
  const boardDefinition = createBoardDefinition(
    5,
    5,
    { row: 2, column: 2 },
    [],
  );
  const tiles: Record<TileId, Tile> = {};
  const tileId = createTileId();
  tiles[tileId] = createLetterTile(tileId, "K", 3);
  const boardState = placeCommittedTile(
    createBoardState(),
    { row: 2, column: 2 },
    tileId,
  );
  return { boardDefinition, boardState, tiles };
}

describe("GameOverScreen", () => {
  it("shows final scores, the winner, and rack deductions", () => {
    const august = createPlayerId();
    const anna = createPlayerId();
    const result = createGameResult(
      { [august]: 312, [anna]: 298 },
      [august],
      { [august]: 4, [anna]: 12 },
      "NO_TILES_AND_NO_MORE_PLAY",
    );

    render(
      <GameOverScreen
        players={[
          { id: august, name: "August" },
          { id: anna, name: "Anna" },
        ]}
        result={result}
        history={createGameHistory()}
        {...finishedBoard()}
        onNewGame={vi.fn()}
      />,
    );

    expect(screen.getByText("312")).toBeInTheDocument();
    expect(screen.getByText("298")).toBeInTheDocument();
    expect(screen.getByText("August vinner!")).toBeInTheDocument();
    expect(screen.getByText("August: −4")).toBeInTheDocument();
    expect(screen.getByText("Anna: −12")).toBeInTheDocument();
  });

  it("announces a tie when there is no single winner", () => {
    const august = createPlayerId();
    const anna = createPlayerId();
    const result = createGameResult(
      { [august]: 200, [anna]: 200 },
      [],
      { [august]: 0, [anna]: 0 },
      "CONSECUTIVE_PASSES",
    );

    render(
      <GameOverScreen
        players={[
          { id: august, name: "August" },
          { id: anna, name: "Anna" },
        ]}
        result={result}
        history={createGameHistory()}
        {...finishedBoard()}
        onNewGame={vi.fn()}
      />,
    );

    expect(screen.getByText("Oavgjort.")).toBeInTheDocument();
  });

  it("calls onNewGame when the action button is pressed", async () => {
    const august = createPlayerId();
    const anna = createPlayerId();
    const onNewGame = vi.fn();
    const result = createGameResult(
      { [august]: 10, [anna]: 5 },
      [august],
      { [august]: 0, [anna]: 0 },
      "NO_TILES_AND_NO_MORE_PLAY",
    );

    render(
      <GameOverScreen
        players={[
          { id: august, name: "August" },
          { id: anna, name: "Anna" },
        ]}
        result={result}
        history={createGameHistory()}
        {...finishedBoard()}
        onNewGame={onNewGame}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Nytt spel" }));
    expect(onNewGame).toHaveBeenCalledOnce();
  });

  it("shows the finished board, after the result and the deductions", () => {
    const august = createPlayerId();
    const anna = createPlayerId();
    const board = finishedBoard();

    render(
      <GameOverScreen
        players={[
          { id: august, name: "August" },
          { id: anna, name: "Anna" },
        ]}
        result={createGameResult(
          { [august]: 12, [anna]: 8 },
          [august],
          { [august]: 0, [anna]: 3 },
          "NO_TILES_AND_NO_MORE_PLAY",
        )}
        history={createGameHistory()}
        {...board}
        onNewGame={vi.fn()}
      />,
    );

    const finalBoard = screen.getByRole("grid", { name: "Spelplan" });
    expect(finalBoard).toBeInTheDocument();
    expect(finalBoard).toHaveTextContent("K");

    // Players look for the outcome first and then talk the board over, so it comes after both
    // the winner and the rack deductions.
    const order = (node: Element) =>
      Array.from(document.querySelectorAll("*")).indexOf(node);
    expect(order(screen.getByText("August vinner!"))).toBeLessThan(
      order(finalBoard),
    );
    expect(order(screen.getByText("Kvarvarande brickor"))).toBeLessThan(
      order(finalBoard),
    );
  });

  it("offers nothing to tap on the finished board", () => {
    const august = createPlayerId();
    const anna = createPlayerId();

    render(
      <GameOverScreen
        players={[
          { id: august, name: "August" },
          { id: anna, name: "Anna" },
        ]}
        result={createGameResult(
          { [august]: 12, [anna]: 8 },
          [august],
          { [august]: 0, [anna]: 3 },
          "MANUALLY_ENDED",
        )}
        history={createGameHistory()}
        {...finishedBoard()}
        onNewGame={vi.fn()}
      />,
    );

    // The game is over, so no square is a placement target and no tile can be picked up.
    const finalBoard = screen.getByRole("grid", { name: "Spelplan" });
    expect(finalBoard.querySelectorAll("button")).toHaveLength(0);
  });
});
