import { describe, expect, it } from "vitest";
import { SCRABBLE_BOARD_DEFINITION } from "../../data/board/scrabbleBoard";
import { SWEDISH_ALPHABET } from "../configuration/swedishAlphabet";
import { isOccupied, placeCommittedTile } from "../model/board";
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
    expect(
      isOccupied(undone.state.board, setup.board.centreCoordinate),
    ).toBe(true);
    const player = undone.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    expect(player.rack.tileIds).not.toContain(existingTileId);
    expect(player.rack.tileIds).toContain(tileId);
    expect(undone.state.pendingMove).toBeUndefined();
  });
});
