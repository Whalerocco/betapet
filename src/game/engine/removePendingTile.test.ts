import { describe, expect, it } from "vitest";
import { SCRABBLE_BOARD_DEFINITION } from "../../data/board/scrabbleBoard";
import { SWEDISH_ALPHABET } from "../configuration/swedishAlphabet";
import { getTileIdAt, isOccupied, placeCommittedTile } from "../model/board";
import type { GameState } from "../model/game";
import { createTileId, type TileId } from "../model/ids";
import type { Player } from "../model/player";
import { createLetterTile, type Tile } from "../model/tile";
import { buildEngineTestGame, letterTileIdsInRack } from "../testing/fixtures";
import { createGame } from "./createGame";
import { placeTile } from "./placeTile";
import { removePendingTile } from "./removePendingTile";

function letterTile(tiles: Record<TileId, Tile>, letter: string): TileId {
  const id = createTileId();
  tiles[id] = createLetterTile(id, letter, 1);
  return id;
}

function currentPlayer(state: GameState): Player {
  return state.players.find((p) => p.id === state.currentPlayerId)!;
}

function gameWithOnePendingTile() {
  const state = createGame({
    playerOneName: "Alice",
    playerTwoName: "Bob",
    rackSize: 7,
  });
  const [tileId] = letterTileIdsInRack(state, state.currentPlayerId);
  const placed = placeTile(state, SCRABBLE_BOARD_DEFINITION, SWEDISH_ALPHABET, {
    playerId: state.currentPlayerId,
    tileId,
    coordinate: SCRABBLE_BOARD_DEFINITION.centreCoordinate,
  });
  if (!placed.success) throw new Error("setup failed");
  return { state: placed.state, tileId };
}

describe("removePendingTile", () => {
  it("returns the tile to the player's rack", () => {
    const { state, tileId } = gameWithOnePendingTile();

    const result = removePendingTile(state, {
      playerId: state.currentPlayerId,
      tileId,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(currentPlayer(result.state).rack.tileIds).toContain(tileId);
  });

  it("clears the pending move once its last tile is removed", () => {
    const { state, tileId } = gameWithOnePendingTile();

    const result = removePendingTile(state, {
      playerId: state.currentPlayerId,
      tileId,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove).toBeUndefined();
  });

  it("keeps the pending move alive if other tiles remain placed", () => {
    const { state, tileId } = gameWithOnePendingTile();
    const [secondTileId] = letterTileIdsInRack(state, state.currentPlayerId);
    const placedSecond = placeTile(
      state,
      SCRABBLE_BOARD_DEFINITION,
      SWEDISH_ALPHABET,
      {
        playerId: state.currentPlayerId,
        tileId: secondTileId,
        coordinate: { row: 3, column: 3 },
      },
    );
    if (!placedSecond.success) throw new Error("setup failed");

    const result = removePendingTile(placedSecond.state, {
      playerId: state.currentPlayerId,
      tileId,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove?.placedTiles).toEqual([
      {
        tileId: secondTileId,
        coordinate: { row: 3, column: 3 },
        representedLetter: undefined,
      },
    ]);
  });

  it("rejects removing a tile that is not part of the pending move", () => {
    const { state } = gameWithOnePendingTile();
    const someOtherTileId = currentPlayer(state).rack.tileIds[0];

    const result = removePendingTile(state, {
      playerId: state.currentPlayerId,
      tileId: someOtherTileId,
    });

    expect(result).toEqual({
      success: false,
      error: { code: "INVALID_TILE", messageKey: "tileNotPending" },
    });
  });

  it("rejects removal with no pending move at all", () => {
    const state = createGame({
      playerOneName: "Alice",
      playerTwoName: "Bob",
      rackSize: 7,
    });

    const result = removePendingTile(state, {
      playerId: state.currentPlayerId,
      tileId: currentPlayer(state).rack.tileIds[0],
    });

    expect(result).toEqual({
      success: false,
      error: { code: "INVALID_TILE", messageKey: "tileNotPending" },
    });
  });
});

describe("removePendingTile: undoing a Replace-mode placement", () => {
  it("puts the displaced tile back on the board and out of the rack", () => {
    const setup = buildEngineTestGame();
    const existingTileId = letterTile(setup.tiles, "S");
    const board = placeCommittedTile(
      setup.state.board,
      setup.board.centreCoordinate,
      existingTileId,
    );
    const state = { ...setup.state, board };
    const [tileId] = state.players[0].rack.tileIds;

    const replaced = placeTile(
      state,
      setup.board,
      [],
      {
        playerId: setup.playerOneId,
        tileId,
        coordinate: setup.board.centreCoordinate,
      },
      { allowReplace: true },
    );
    expect(replaced.success).toBe(true);
    if (!replaced.success) return;

    const undone = removePendingTile(replaced.state, {
      playerId: setup.playerOneId,
      tileId,
    });

    expect(undone.success).toBe(true);
    if (!undone.success) return;
    expect(isOccupied(undone.state.board, setup.board.centreCoordinate)).toBe(
      true,
    );
    const player = undone.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    expect(player.rack.tileIds).not.toContain(existingTileId);
    expect(player.rack.tileIds).toContain(tileId);
    expect(undone.state.pendingMove).toBeUndefined();
  });
});

describe("removePendingTile: the displaced tile was already re-played elsewhere", () => {
  /**
   * Replace a committed tile, play the displaced tile on another square, then take the replacing
   * tile back. Reported during the Version 1 hot-seat test: this used to throw out of the engine,
   * because reversing the displacement assumed the displaced tile was still sitting in the rack.
   */
  function gameWithDisplacedTileReplayed() {
    const setup = buildEngineTestGame({
      playerOneRackLetters: ["A", "B"],
      modifiers: new Set(["REPLACE"]),
    });
    const centre = setup.board.centreCoordinate;
    const elsewhere = { row: centre.row, column: centre.column + 1 };
    const committedTileId = createTileId();
    setup.tiles[committedTileId] = createLetterTile(committedTileId, "X", 8);
    const board = placeCommittedTile(
      setup.state.board,
      centre,
      committedTileId,
    );
    const [replacingTileId] = setup.state.players[0].rack.tileIds;

    const replaced = placeTile(
      { ...setup.state, board },
      setup.board,
      [],
      {
        playerId: setup.playerOneId,
        tileId: replacingTileId,
        coordinate: centre,
      },
      { allowReplace: true },
    );
    if (!replaced.success) throw new Error("setup failed");

    const replayed = placeTile(
      replaced.state,
      setup.board,
      [],
      {
        playerId: setup.playerOneId,
        tileId: committedTileId,
        coordinate: elsewhere,
      },
      { allowReplace: true },
    );
    if (!replayed.success) throw new Error("setup failed");

    return {
      setup,
      state: replayed.state,
      centre,
      elsewhere,
      committedTileId,
      replacingTileId,
    };
  }

  it("puts the displaced tile back on its own square and undoes its other placement", () => {
    const {
      setup,
      state,
      centre,
      elsewhere,
      committedTileId,
      replacingTileId,
    } = gameWithDisplacedTileReplayed();

    const result = removePendingTile(state, {
      playerId: setup.playerOneId,
      tileId: replacingTileId,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    // The board is back exactly as it was before the replace.
    expect(getTileIdAt(result.state.board, centre)).toBe(committedTileId);
    expect(getTileIdAt(result.state.board, elsewhere)).toBeUndefined();
    // One tile cannot be in two places, so the square it had been re-played on is empty again.
    expect(result.state.pendingMove).toBeUndefined();
    const rack = result.state.players.find((p) => p.id === setup.playerOneId)!
      .rack.tileIds;
    expect(rack).toContain(replacingTileId);
    expect(rack).not.toContain(committedTileId);
  });

  it("leaves the player's other pending tiles alone", () => {
    const { setup, state, centre, committedTileId, replacingTileId } =
      gameWithDisplacedTileReplayed();
    const otherTileId = state.players
      .find((p) => p.id === setup.playerOneId)!
      .rack.tileIds.find((id) => id !== committedTileId)!;
    const untouched = { row: centre.row + 3, column: centre.column };

    const withThird = placeTile(
      state,
      setup.board,
      [],
      {
        playerId: setup.playerOneId,
        tileId: otherTileId,
        coordinate: untouched,
      },
      { allowReplace: true },
    );
    if (!withThird.success) throw new Error("setup failed");

    const result = removePendingTile(withThird.state, {
      playerId: setup.playerOneId,
      tileId: replacingTileId,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove?.placedTiles).toEqual([
      {
        tileId: otherTileId,
        coordinate: untouched,
        representedLetter: undefined,
      },
    ]);
  });
});
