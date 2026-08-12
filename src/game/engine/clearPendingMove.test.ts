import { describe, expect, it } from "vitest";
import { SCRABBLE_BOARD_DEFINITION } from "../../data/board/scrabbleBoard";
import { SWEDISH_ALPHABET } from "../configuration/swedishAlphabet";
import type { GameState } from "../model/game";
import type { Player } from "../model/player";
import { letterTileIdsInRack } from "../testing/fixtures";
import { clearPendingMove } from "./clearPendingMove";
import { createGame } from "./createGame";
import { placeTile } from "./placeTile";

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
