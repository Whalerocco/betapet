import { describe, expect, it } from "vitest";
import { SCRABBLE_BOARD_DEFINITION } from "../../data/board/scrabbleBoard";
import { SWEDISH_ALPHABET } from "../configuration/swedishAlphabet";
import { isOccupied, placeCommittedTile } from "../model/board";
import type { GameState } from "../model/game";
import { createGameResult } from "../model/gameResult";
import { createTileId, type TileId } from "../model/ids";
import type { Player } from "../model/player";
import { createBlankTile, createLetterTile, type Tile } from "../model/tile";
import { finishedTurnState } from "../model/turnState";
import {
  buildEngineTestGame,
  letterTileIdsInRack,
  relocateTileToRack,
} from "../testing/fixtures";
import { createGame } from "./createGame";
import { placeTile } from "./placeTile";

/** Registers a new committed-tile candidate directly in a test game's tile registry. */
function letterTile(tiles: Record<TileId, Tile>, letter: string): TileId {
  const id = createTileId();
  tiles[id] = createLetterTile(id, letter, 1);
  return id;
}

function newGame() {
  return createGame({
    playerOneName: "Alice",
    playerTwoName: "Bob",
    rackSize: 7,
  });
}

function currentPlayer(state: GameState): Player {
  return state.players.find((p) => p.id === state.currentPlayerId)!;
}

function opponentOf(state: GameState): Player {
  return state.players.find((p) => p.id !== state.currentPlayerId)!;
}

describe("placeTile", () => {
  it("moves the tile from the rack into a new pending move", () => {
    const state = newGame();
    const [tileId] = letterTileIdsInRack(state, state.currentPlayerId);
    const centre = SCRABBLE_BOARD_DEFINITION.centreCoordinate;

    const result = placeTile(
      state,
      SCRABBLE_BOARD_DEFINITION,
      SWEDISH_ALPHABET,
      {
        playerId: state.currentPlayerId,
        tileId,
        coordinate: centre,
      },
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(currentPlayer(result.state).rack.tileIds).not.toContain(tileId);
    expect(result.state.pendingMove?.placedTiles).toEqual([
      { tileId, coordinate: centre, representedLetter: undefined },
    ]);
  });

  it("accumulates a second tile into the same pending move", () => {
    const state = newGame();
    const [tileA, tileB] = letterTileIdsInRack(state, state.currentPlayerId, 2);
    const centre = SCRABBLE_BOARD_DEFINITION.centreCoordinate;

    const first = placeTile(
      state,
      SCRABBLE_BOARD_DEFINITION,
      SWEDISH_ALPHABET,
      {
        playerId: state.currentPlayerId,
        tileId: tileA,
        coordinate: centre,
      },
    );
    expect(first.success).toBe(true);
    if (!first.success) return;

    const second = placeTile(
      first.state,
      SCRABBLE_BOARD_DEFINITION,
      SWEDISH_ALPHABET,
      {
        playerId: state.currentPlayerId,
        tileId: tileB,
        coordinate: { row: centre.row, column: centre.column + 1 },
      },
    );

    expect(second.success).toBe(true);
    if (!second.success) return;
    expect(second.state.pendingMove?.placedTiles).toHaveLength(2);
  });

  it("rejects a tile that does not belong to the acting player's rack", () => {
    const state = newGame();
    const opponentTileId = opponentOf(state).rack.tileIds[0];

    const result = placeTile(
      state,
      SCRABBLE_BOARD_DEFINITION,
      SWEDISH_ALPHABET,
      {
        playerId: state.currentPlayerId,
        tileId: opponentTileId,
        coordinate: SCRABBLE_BOARD_DEFINITION.centreCoordinate,
      },
    );

    expect(result).toEqual({
      success: false,
      error: { code: "TILE_NOT_IN_RACK", messageKey: "tileNotInRack" },
    });
  });

  it("rejects a tile that does not exist anywhere in the game", () => {
    const state = newGame();
    const result = placeTile(
      state,
      SCRABBLE_BOARD_DEFINITION,
      SWEDISH_ALPHABET,
      {
        playerId: state.currentPlayerId,
        tileId: createTileId(),
        coordinate: SCRABBLE_BOARD_DEFINITION.centreCoordinate,
      },
    );
    expect(result.success).toBe(false);
  });

  it("rejects a move attempted by the player who is not currently acting", () => {
    const state = newGame();
    const opponent = opponentOf(state);

    const result = placeTile(
      state,
      SCRABBLE_BOARD_DEFINITION,
      SWEDISH_ALPHABET,
      {
        playerId: opponent.id,
        tileId: opponent.rack.tileIds[0],
        coordinate: SCRABBLE_BOARD_DEFINITION.centreCoordinate,
      },
    );

    expect(result).toEqual({
      success: false,
      error: { code: "NOT_YOUR_TURN", messageKey: "notYourTurn" },
    });
  });

  it("rejects an out-of-bounds coordinate", () => {
    const state = newGame();
    const result = placeTile(
      state,
      SCRABBLE_BOARD_DEFINITION,
      SWEDISH_ALPHABET,
      {
        playerId: state.currentPlayerId,
        tileId: letterTileIdsInRack(state, state.currentPlayerId)[0],
        coordinate: { row: -1, column: 0 },
      },
    );
    expect(result).toEqual({
      success: false,
      error: { code: "INVALID_PLACEMENT", messageKey: "invalidPlacement" },
    });
  });

  it("rejects placing two tiles on the same coordinate", () => {
    const state = newGame();
    const [tileA, tileB] = letterTileIdsInRack(state, state.currentPlayerId, 2);
    const coordinate = SCRABBLE_BOARD_DEFINITION.centreCoordinate;

    const first = placeTile(
      state,
      SCRABBLE_BOARD_DEFINITION,
      SWEDISH_ALPHABET,
      {
        playerId: state.currentPlayerId,
        tileId: tileA,
        coordinate,
      },
    );
    expect(first.success).toBe(true);
    if (!first.success) return;

    const second = placeTile(
      first.state,
      SCRABBLE_BOARD_DEFINITION,
      SWEDISH_ALPHABET,
      {
        playerId: state.currentPlayerId,
        tileId: tileB,
        coordinate,
      },
    );

    expect(second).toEqual({
      success: false,
      error: { code: "INVALID_PLACEMENT", messageKey: "invalidPlacement" },
    });
  });

  it("requires a represented letter for a blank tile", () => {
    let state = newGame();
    const blankTileId = Object.values(state.tiles).find(
      (t) => t.kind === "BLANK",
    )!.id;
    state = relocateTileToRack(state, state.currentPlayerId, blankTileId);

    const result = placeTile(
      state,
      SCRABBLE_BOARD_DEFINITION,
      SWEDISH_ALPHABET,
      {
        playerId: state.currentPlayerId,
        tileId: blankTileId,
        coordinate: SCRABBLE_BOARD_DEFINITION.centreCoordinate,
      },
    );

    expect(result).toEqual({
      success: false,
      error: {
        code: "BLANK_LETTER_REQUIRED",
        messageKey: "blankLetterRequired",
      },
    });
  });

  it("accepts a blank tile with a valid represented letter", () => {
    let state = newGame();
    const blankTileId = Object.values(state.tiles).find(
      (t) => t.kind === "BLANK",
    )!.id;
    state = relocateTileToRack(state, state.currentPlayerId, blankTileId);

    const result = placeTile(
      state,
      SCRABBLE_BOARD_DEFINITION,
      SWEDISH_ALPHABET,
      {
        playerId: state.currentPlayerId,
        tileId: blankTileId,
        coordinate: SCRABBLE_BOARD_DEFINITION.centreCoordinate,
        representedLetter: "Ö",
      },
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove?.placedTiles[0].representedLetter).toBe(
      "Ö",
    );
  });

  it("rejects an invalid represented letter for a blank tile", () => {
    let state = newGame();
    const blankTileId = Object.values(state.tiles).find(
      (t) => t.kind === "BLANK",
    )!.id;
    state = relocateTileToRack(state, state.currentPlayerId, blankTileId);

    const result = placeTile(
      state,
      SCRABBLE_BOARD_DEFINITION,
      SWEDISH_ALPHABET,
      {
        playerId: state.currentPlayerId,
        tileId: blankTileId,
        coordinate: SCRABBLE_BOARD_DEFINITION.centreCoordinate,
        representedLetter: "1",
      },
    );

    expect(result).toEqual({
      success: false,
      error: { code: "INVALID_BLANK_LETTER", messageKey: "invalidBlankLetter" },
    });
  });

  it("rejects a represented letter supplied for a non-blank tile", () => {
    const state = newGame();
    const [tileId] = letterTileIdsInRack(state, state.currentPlayerId);

    const result = placeTile(
      state,
      SCRABBLE_BOARD_DEFINITION,
      SWEDISH_ALPHABET,
      {
        playerId: state.currentPlayerId,
        tileId,
        coordinate: SCRABBLE_BOARD_DEFINITION.centreCoordinate,
        representedLetter: "A",
      },
    );

    expect(result).toEqual({
      success: false,
      error: {
        code: "UNEXPECTED_BLANK_LETTER",
        messageKey: "unexpectedBlankLetter",
      },
    });
  });

  it("rejects play once the game is finished", () => {
    const state = newGame();
    const result = createGameResult(
      { [state.players[0].id]: 10, [state.players[1].id]: 5 },
      [state.players[0].id],
      { [state.players[0].id]: 0, [state.players[1].id]: 0 },
      "NO_TILES_AND_NO_MORE_PLAY",
    );
    const finishedState = {
      ...state,
      status: "FINISHED" as const,
      turnState: finishedTurnState(),
      result,
    };

    const placement = placeTile(
      finishedState,
      SCRABBLE_BOARD_DEFINITION,
      SWEDISH_ALPHABET,
      {
        playerId: state.currentPlayerId,
        tileId: currentPlayer(state).rack.tileIds[0],
        coordinate: SCRABBLE_BOARD_DEFINITION.centreCoordinate,
      },
    );

    expect(placement).toEqual({
      success: false,
      error: { code: "GAME_NOT_ACTIVE", messageKey: "gameNotActive" },
    });
  });
});

describe("placeTile: Replace mode (allowReplace)", () => {
  it("rejects an occupied cell by default, without the option", () => {
    const setup = buildEngineTestGame();
    const existingTileId = letterTile(setup.tiles, "S");
    const board = placeCommittedTile(
      setup.state.board,
      setup.board.centreCoordinate,
      existingTileId,
    );
    const state = { ...setup.state, board };
    const [tileId] = state.players[0].rack.tileIds;

    const result = placeTile(state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId,
      coordinate: setup.board.centreCoordinate,
    });

    expect(result).toEqual({
      success: false,
      error: { code: "INVALID_PLACEMENT", messageKey: "invalidPlacement" },
    });
  });

  it("displaces the committed tile to the replacing player's rack", () => {
    const setup = buildEngineTestGame();
    const existingTileId = letterTile(setup.tiles, "S");
    const board = placeCommittedTile(
      setup.state.board,
      setup.board.centreCoordinate,
      existingTileId,
    );
    const state = { ...setup.state, board };
    const [tileId] = state.players[0].rack.tileIds;

    const result = placeTile(
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

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(isOccupied(result.state.board, setup.board.centreCoordinate)).toBe(
      false,
    );
    const replacingPlayer = result.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    expect(replacingPlayer.rack.tileIds).toContain(existingTileId);
    expect(
      result.state.pendingMove?.placedTiles.find((p) => p.tileId === tileId)
        ?.replacedTileId,
    ).toBe(existingTileId);
  });

  it("gives the displaced tile to the replacing player even if the opponent originally played it (DEC-008)", () => {
    const setup = buildEngineTestGame();
    const opponentsTile = letterTile(setup.tiles, "S");
    const board = placeCommittedTile(
      setup.state.board,
      setup.board.centreCoordinate,
      opponentsTile,
    );
    const state = { ...setup.state, board };
    const [tileId] = state.players[0].rack.tileIds;

    const result = placeTile(
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

    expect(result.success).toBe(true);
    if (!result.success) return;
    const replacingPlayer = result.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    const opponent = result.state.players.find(
      (p) => p.id === setup.playerTwoId,
    )!;
    expect(replacingPlayer.rack.tileIds).toContain(opponentsTile);
    expect(opponent.rack.tileIds).not.toContain(opponentsTile);
  });

  it("rejects using a tile displaced earlier this move to replace another tile (no chaining)", () => {
    const setup = buildEngineTestGame();
    const firstTargetTileId = letterTile(setup.tiles, "S");
    const secondTargetTileId = letterTile(setup.tiles, "T");
    let board = placeCommittedTile(
      setup.state.board,
      setup.board.centreCoordinate,
      firstTargetTileId,
    );
    board = placeCommittedTile(
      board,
      { row: setup.board.centreCoordinate.row, column: setup.board.centreCoordinate.column + 1 },
      secondTargetTileId,
    );
    const state = { ...setup.state, board };
    const [tileId] = state.players[0].rack.tileIds;

    const firstReplace = placeTile(
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
    expect(firstReplace.success).toBe(true);
    if (!firstReplace.success) return;

    // Try to use the just-displaced tile to replace the second cell, within the same move.
    const secondReplace = placeTile(
      firstReplace.state,
      setup.board,
      [],
      {
        playerId: setup.playerOneId,
        tileId: firstTargetTileId,
        coordinate: {
          row: setup.board.centreCoordinate.row,
          column: setup.board.centreCoordinate.column + 1,
        },
      },
      { allowReplace: true },
    );

    expect(secondReplace).toEqual({
      success: false,
      error: {
        code: "REPLACE_CHAINING_NOT_ALLOWED",
        messageKey: "replaceChainingNotAllowed",
      },
    });
  });

  it("still allows placing the just-displaced tile normally, on an empty cell, the same move", () => {
    const setup = buildEngineTestGame();
    const existingTileId = letterTile(setup.tiles, "S");
    const board = placeCommittedTile(
      setup.state.board,
      setup.board.centreCoordinate,
      existingTileId,
    );
    const state = { ...setup.state, board };
    const [tileId] = state.players[0].rack.tileIds;

    const firstReplace = placeTile(
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
    expect(firstReplace.success).toBe(true);
    if (!firstReplace.success) return;

    const normalPlacement = placeTile(
      firstReplace.state,
      setup.board,
      [],
      {
        playerId: setup.playerOneId,
        tileId: existingTileId,
        coordinate: {
          row: setup.board.centreCoordinate.row,
          column: setup.board.centreCoordinate.column + 1,
        },
      },
      { allowReplace: true },
    );

    expect(normalPlacement.success).toBe(true);
  });

  it("rejects a replace targeting a cell already claimed by this pending move", () => {
    const setup = buildEngineTestGame();
    const existingTileId = letterTile(setup.tiles, "S");
    const board = placeCommittedTile(
      setup.state.board,
      setup.board.centreCoordinate,
      existingTileId,
    );
    const state = { ...setup.state, board };
    const [firstTileId, secondTileId] = state.players[0].rack.tileIds;

    const first = placeTile(
      state,
      setup.board,
      [],
      {
        playerId: setup.playerOneId,
        tileId: firstTileId,
        coordinate: setup.board.centreCoordinate,
      },
      { allowReplace: true },
    );
    expect(first.success).toBe(true);
    if (!first.success) return;

    const second = placeTile(
      first.state,
      setup.board,
      [],
      {
        playerId: setup.playerOneId,
        tileId: secondTileId,
        coordinate: setup.board.centreCoordinate,
      },
      { allowReplace: true },
    );

    expect(second).toEqual({
      success: false,
      error: { code: "INVALID_PLACEMENT", messageKey: "invalidPlacement" },
    });
  });

  it("lets a displaced blank be re-placed representing a different letter (DEC-008)", () => {
    const setup = buildEngineTestGame();
    const blankId = createTileId();
    setup.tiles[blankId] = {
      ...createBlankTile(blankId),
      representedLetter: "X",
    };
    const centre = setup.board.centreCoordinate;
    const board = placeCommittedTile(setup.state.board, centre, blankId);
    const state = { ...setup.state, board };
    const [tileId] = state.players[0].rack.tileIds;

    const replaced = placeTile(
      state,
      setup.board,
      SWEDISH_ALPHABET,
      { playerId: setup.playerOneId, tileId, coordinate: centre },
      { allowReplace: true },
    );
    expect(replaced.success).toBe(true);
    if (!replaced.success) return;
    expect(
      replaced.state.players
        .find((p) => p.id === setup.playerOneId)!
        .rack.tileIds.includes(blankId),
    ).toBe(true);

    // Re-place the now-displaced blank elsewhere, choosing a different letter than before.
    const replacedElsewhere = placeTile(
      replaced.state,
      setup.board,
      SWEDISH_ALPHABET,
      {
        playerId: setup.playerOneId,
        tileId: blankId,
        coordinate: { row: centre.row, column: centre.column + 1 },
        representedLetter: "Q",
      },
      { allowReplace: true },
    );

    expect(replacedElsewhere.success).toBe(true);
    if (!replacedElsewhere.success) return;
    const pending = replacedElsewhere.state.pendingMove?.placedTiles.find(
      (p) => p.tileId === blankId,
    );
    expect(pending?.representedLetter).toBe("Q");
  });
});
