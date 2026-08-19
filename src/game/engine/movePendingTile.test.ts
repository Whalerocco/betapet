import { describe, expect, it } from "vitest";
import { SCRABBLE_BOARD_DEFINITION } from "../../data/board/scrabbleBoard";
import { SWEDISH_ALPHABET } from "../configuration/swedishAlphabet";
import { isOccupied, placeCommittedTile } from "../model/board";
import type { GameState } from "../model/game";
import { createTileId, type TileId } from "../model/ids";
import type { Player } from "../model/player";
import { createLetterTile, type Tile } from "../model/tile";
import {
  buildEngineTestGame,
  letterTileIdsInRack,
  relocateTileToRack,
} from "../testing/fixtures";
import { createGame } from "./createGame";
import { movePendingTile } from "./movePendingTile";
import { placeTile } from "./placeTile";

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
  const centre = SCRABBLE_BOARD_DEFINITION.centreCoordinate;
  const placed = placeTile(state, SCRABBLE_BOARD_DEFINITION, SWEDISH_ALPHABET, {
    playerId: state.currentPlayerId,
    tileId,
    coordinate: centre,
  });
  if (!placed.success) throw new Error("setup failed");
  return { state: placed.state, tileId, centre };
}

describe("movePendingTile", () => {
  it("moves a pending tile to a new empty coordinate", () => {
    const { state, tileId, centre } = gameWithOnePendingTile();
    const target = { row: centre.row + 1, column: centre.column };

    const result = movePendingTile(state, SCRABBLE_BOARD_DEFINITION, {
      playerId: state.currentPlayerId,
      tileId,
      coordinate: target,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove?.placedTiles).toEqual([
      { tileId, coordinate: target, representedLetter: undefined },
    ]);
  });

  it("preserves the tile's identity and represented letter", () => {
    let state = createGame({
      playerOneName: "Alice",
      playerTwoName: "Bob",
      rackSize: 7,
    });
    const blankTileId = Object.values(state.tiles).find(
      (t) => t.kind === "BLANK",
    )!.id;
    state = relocateTileToRack(state, state.currentPlayerId, blankTileId);
    const centre = SCRABBLE_BOARD_DEFINITION.centreCoordinate;
    const placed = placeTile(
      state,
      SCRABBLE_BOARD_DEFINITION,
      SWEDISH_ALPHABET,
      {
        playerId: state.currentPlayerId,
        tileId: blankTileId,
        coordinate: centre,
        representedLetter: "Z",
      },
    );
    if (!placed.success) throw new Error("setup failed");

    const target = { row: centre.row, column: centre.column + 2 };
    const result = movePendingTile(placed.state, SCRABBLE_BOARD_DEFINITION, {
      playerId: state.currentPlayerId,
      tileId: blankTileId,
      coordinate: target,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove?.placedTiles).toEqual([
      { tileId: blankTileId, coordinate: target, representedLetter: "Z" },
    ]);
  });

  it("rejects moving a tile that is not part of the current pending move", () => {
    const { state } = gameWithOnePendingTile();
    const someOtherTileId = currentPlayer(state).rack.tileIds[0];

    const result = movePendingTile(state, SCRABBLE_BOARD_DEFINITION, {
      playerId: state.currentPlayerId,
      tileId: someOtherTileId,
      coordinate: { row: 3, column: 3 },
    });

    expect(result).toEqual({
      success: false,
      error: { code: "INVALID_TILE", messageKey: "tileNotPending" },
    });
  });

  it("rejects moving a committed tile (it is never part of a pending move)", () => {
    const { state } = gameWithOnePendingTile();

    const result = movePendingTile(state, SCRABBLE_BOARD_DEFINITION, {
      playerId: state.currentPlayerId,
      // A tile still sitting in the bag stands in for "not currently pending" here.
      tileId: state.tileBag.tileIds[0],
      coordinate: { row: 3, column: 3 },
    });

    expect(result).toEqual({
      success: false,
      error: { code: "INVALID_TILE", messageKey: "tileNotPending" },
    });
  });

  it("rejects moving onto an occupied coordinate", () => {
    const { state, tileId } = gameWithOnePendingTile();
    const [secondTileId] = letterTileIdsInRack(state, state.currentPlayerId);
    const secondCoordinate = { row: 3, column: 3 };
    const placedSecond = placeTile(
      state,
      SCRABBLE_BOARD_DEFINITION,
      SWEDISH_ALPHABET,
      {
        playerId: state.currentPlayerId,
        tileId: secondTileId,
        coordinate: secondCoordinate,
      },
    );
    if (!placedSecond.success) throw new Error("setup failed");

    const result = movePendingTile(
      placedSecond.state,
      SCRABBLE_BOARD_DEFINITION,
      {
        playerId: state.currentPlayerId,
        tileId,
        coordinate: secondCoordinate,
      },
    );

    expect(result).toEqual({
      success: false,
      error: { code: "INVALID_PLACEMENT", messageKey: "invalidPlacement" },
    });
  });

  it("allows moving a tile to its own current coordinate", () => {
    const { state, tileId, centre } = gameWithOnePendingTile();

    const result = movePendingTile(state, SCRABBLE_BOARD_DEFINITION, {
      playerId: state.currentPlayerId,
      tileId,
      coordinate: centre,
    });

    expect(result.success).toBe(true);
  });

  it("rejects an out-of-bounds target", () => {
    const { state, tileId } = gameWithOnePendingTile();

    const result = movePendingTile(state, SCRABBLE_BOARD_DEFINITION, {
      playerId: state.currentPlayerId,
      tileId,
      coordinate: { row: 99, column: 99 },
    });

    expect(result).toEqual({
      success: false,
      error: { code: "INVALID_PLACEMENT", messageKey: "invalidPlacement" },
    });
  });
});

describe("movePendingTile: relocating a Replace-mode placement", () => {
  it("undoes the displacement at the old coordinate when moved to an empty cell", () => {
    const setup = buildEngineTestGame();
    const existingTileId = letterTile(setup.tiles, "S");
    const centre = setup.board.centreCoordinate;
    const board = placeCommittedTile(setup.state.board, centre, existingTileId);
    const state = { ...setup.state, board };
    const [tileId] = state.players[0].rack.tileIds;

    const replaced = placeTile(
      state,
      setup.board,
      [],
      { playerId: setup.playerOneId, tileId, coordinate: centre },
      { allowReplace: true },
    );
    if (!replaced.success) throw new Error("setup failed");

    const newCoordinate = { row: centre.row, column: centre.column + 1 };
    const moved = movePendingTile(replaced.state, setup.board, {
      playerId: setup.playerOneId,
      tileId,
      coordinate: newCoordinate,
    });

    expect(moved.success).toBe(true);
    if (!moved.success) return;
    // The displaced tile is back where it was, and out of the rack again.
    expect(isOccupied(moved.state.board, centre)).toBe(true);
    const player = moved.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    expect(player.rack.tileIds).not.toContain(existingTileId);
    // The moving tile is now an ordinary pending placement at the new coordinate.
    const pending = moved.state.pendingMove?.placedTiles.find(
      (p) => p.tileId === tileId,
    );
    expect(pending?.coordinate).toEqual(newCoordinate);
    expect(pending?.replacedTileId).toBeUndefined();
  });
});
