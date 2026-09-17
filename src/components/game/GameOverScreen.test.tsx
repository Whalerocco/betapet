import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createBoardDefinition,
  createBoardState,
  placeCommittedTile,
} from "../../game/model/board";
import { addHistoryEvent, createGameHistory } from "../../game/model/history";
import { createGameResult } from "../../game/model/gameResult";
import {
  createHistoryEventId,
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
        actions={{ kind: "LOCAL", onNewGame: vi.fn() }}
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
        actions={{ kind: "LOCAL", onNewGame: vi.fn() }}
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
        actions={{ kind: "LOCAL", onNewGame }}
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
        actions={{ kind: "LOCAL", onNewGame: vi.fn() }}
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
        actions={{ kind: "LOCAL", onNewGame: vi.fn() }}
      />,
    );

    // The game is over, so no square is a placement target and no tile can be picked up.
    const finalBoard = screen.getByRole("grid", { name: "Spelplan" });
    expect(finalBoard.querySelectorAll("button")).toHaveLength(0);
  });
});

/*
 * The ways off the screen (ui-design.md section 39, `known-bugs.md` item 19). A finished online
 * match used to offer one action, `Nytt spel`, which led back to the match list — the only way
 * out, and not the one it named.
 */
describe("GameOverScreen: leaving", () => {
  function renderWith(
    actions: Parameters<typeof GameOverScreen>[0]["actions"],
  ) {
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
          "CONSECUTIVE_PASSES",
        )}
        history={createGameHistory()}
        {...finishedBoard()}
        actions={actions}
      />,
    );
  }

  it("offers a rematch and a way back in an online match", async () => {
    const onRematch = vi.fn();
    const onBack = vi.fn();
    renderWith({ kind: "ONLINE", onRematch, onBack });

    expect(
      screen.queryByRole("button", { name: "Nytt spel" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Revansch" }));
    expect(onRematch).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByRole("button", { name: "Tillbaka" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("still offers the way back when a rematch cannot be offered", () => {
    renderWith({ kind: "ONLINE", onBack: vi.fn() });

    expect(
      screen.queryByRole("button", { name: "Revansch" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tillbaka" }),
    ).toBeInTheDocument();
  });

  it("lets the history flow with the page rather than scrolling inside itself", () => {
    const august = createPlayerId();
    const anna = createPlayerId();
    const history = addHistoryEvent(createGameHistory(), {
      id: createHistoryEventId(),
      sequence: 0,
      type: "WORD_MOVE_COMMITTED",
      playerId: august,
      payload: {
        placedTiles: [],
        words: ["BIL"],
        scoreAwarded: 12,
        usedUnknownWordApproval: false,
      },
    });

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
          "CONSECUTIVE_PASSES",
        )}
        history={history}
        {...finishedBoard()}
        actions={{ kind: "LOCAL", onNewGame: vi.fn() }}
      />,
    );

    /*
     * Asserted through the class, because jsdom computes no layout. A capped list here swallows
     * the drag that would have scrolled the page, which is what made the finished screen read as
     * unscrollable on a phone (`known-bugs.md` item 18); `e2e/online-finished-match.spec.ts`
     * holds the behaviour itself in a real browser.
     */
    // The deductions are a list too, so this asks for the one inside the history drawer.
    const list = within(
      screen.getByText("Historik").closest("details")!,
    ).getByRole("list");
    expect(list.className).toContain("flowing");
  });
});
