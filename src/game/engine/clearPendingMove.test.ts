import { describe, expect, it } from "vitest";
import { SCRABBLE_BOARD_DEFINITION } from "../../data/board/scrabbleBoard";
import { SWEDISH_ALPHABET } from "../configuration/swedishAlphabet";
import { isOccupied, placeCommittedTile } from "../model/board";
import type { GameState } from "../model/game";
import { createTileId, type TileId } from "../model/ids";
import type { Player } from "../model/player";
import { createLetterTile, type Tile } from "../model/tile";
import { buildEngineTestGame, letterTileIdsInRack } from "../testing/fixtures";
import { clearPendingMove } from "./clearPendingMove";
import { createGame } from "./createGame";
import { placeTile } from "./placeTile";

function letterTile(tiles: Record<TileId, Tile>, letter: string): TileId {
  const id = createTileId();
  tiles[id] = createLetterTile(id, letter, 1);
  return id;
}

function currentPlayer(state: GameState): Player {
  return state.players.find((p) => p.id === state.currentPlayerId)!;
}

function gameWithTwoPendingTiles() {
  const state = createGame({
    playerOneName: "Alice",
    playerTwoName: "Bob",
    rackSize: 7,
  });
  const [firstTileId, secondTileId] = letterTileIdsInRack(
    state,
    state.currentPlayerId,
    2,
  );
  const placedFirst = placeTile(
    state,
    SCRABBLE_BOARD_DEFINITION,
    SWEDISH_ALPHABET,
    {
      playerId: state.currentPlayerId,
      tileId: firstTileId,
      coordinate: SCRABBLE_BOARD_DEFINITION.centreCoordinate,
    },
  );
  if (!placedFirst.success) throw new Error("setup failed");
  const placedSecond = placeTile(
    placedFirst.state,
    SCRABBLE_BOARD_DEFINITION,
    SWEDISH_ALPHABET,
    {
      playerId: state.currentPlayerId,
      tileId: secondTileId,
      coordinate: { row: 3, column: 3 },
    },
  );
  if (!placedSecond.success) throw new Error("setup failed");
  return { state: placedSecond.state, firstTileId, secondTileId };
}

describe("clearPendingMove", () => {
  it("returns every pending tile to the rack in one step", () => {
    const { state, firstTileId, secondTileId } = gameWithTwoPendingTiles();

    const result = clearPendingMove(state, {
      playerId: state.currentPlayerId,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(currentPlayer(result.state).rack.tileIds).toContain(firstTileId);
    expect(currentPlayer(result.state).rack.tileIds).toContain(secondTileId);
  });

  it("clears the pending move entirely", () => {
    const { state } = gameWithTwoPendingTiles();

    const result = clearPendingMove(state, {
      playerId: state.currentPlayerId,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove).toBeUndefined();
  });

  it("leaves committed board tiles untouched", () => {
    const { state } = gameWithTwoPendingTiles();

    const result = clearPendingMove(state, {
      playerId: state.currentPlayerId,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.board.occupiedCells).toEqual(state.board.occupiedCells);
  });

  it("rejects clearing with no pending move at all", () => {
    const state = createGame({
      playerOneName: "Alice",
      playerTwoName: "Bob",
      rackSize: 7,
    });

    const result = clearPendingMove(state, {
      playerId: state.currentPlayerId,
    });

    expect(result).toEqual({
      success: false,
      error: { code: "INVALID_GAME_STATE", messageKey: "noPendingMoveToClear" },
    });
  });

  it("rejects when it is not the player's turn", () => {
    const { state } = gameWithTwoPendingTiles();
    const otherPlayerId = state.players.find(
      (p) => p.id !== state.currentPlayerId,
    )!.id;

    const result = clearPendingMove(state, { playerId: otherPlayerId });

    expect(result.success).toBe(false);
  });
});

describe("clearPendingMove: undoing a Replace-mode placement", () => {
  it("restores every displaced tile to the board and removes it from the rack", () => {
    const setup = buildEngineTestGame();
    const firstExisting = letterTile(setup.tiles, "S");
    const secondExisting = letterTile(setup.tiles, "T");
    const centre = setup.board.centreCoordinate;
    let board = placeCommittedTile(setup.state.board, centre, firstExisting);
    board = placeCommittedTile(
      board,
      { row: centre.row, column: centre.column + 1 },
      secondExisting,
    );
    const state = { ...setup.state, board };
    const [firstTileId, secondTileId] = state.players[0].rack.tileIds;

    const firstReplace = placeTile(
      state,
      setup.board,
      [],
      { playerId: setup.playerOneId, tileId: firstTileId, coordinate: centre },
      { allowReplace: true },
    );
    if (!firstReplace.success) throw new Error("setup failed");
    const secondReplace = placeTile(
      firstReplace.state,
      setup.board,
      [],
      {
        playerId: setup.playerOneId,
        tileId: secondTileId,
        coordinate: { row: centre.row, column: centre.column + 1 },
      },
      { allowReplace: true },
    );
    if (!secondReplace.success) throw new Error("setup failed");

    const cleared = clearPendingMove(secondReplace.state, {
      playerId: setup.playerOneId,
    });

    expect(cleared.success).toBe(true);
    if (!cleared.success) return;
    expect(isOccupied(cleared.state.board, centre)).toBe(true);
    expect(
      isOccupied(cleared.state.board, {
        row: centre.row,
        column: centre.column + 1,
      }),
    ).toBe(true);
    const player = cleared.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    expect(player.rack.tileIds).not.toContain(firstExisting);
    expect(player.rack.tileIds).not.toContain(secondExisting);
    expect(player.rack.tileIds).toContain(firstTileId);
    expect(player.rack.tileIds).toContain(secondTileId);
    expect(cleared.state.pendingMove).toBeUndefined();
  });
});
