import { describe, expect, it } from "vitest";
import { SCRABBLE_BOARD_DEFINITION } from "../../data/board/scrabbleBoard";
import { SWEDISH_ALPHABET } from "../configuration/swedishAlphabet";
import { placeCommittedTile } from "../model/board";
import type { GameState } from "../model/game";
import { createTileId } from "../model/ids";
import type { Player } from "../model/player";
import { createLetterTile } from "../model/tile";
import {
  buildEngineTestGame,
  letterTileIdsInRack,
  relocateTileToRack,
} from "../testing/fixtures";
import { changeBlankRepresentedLetter } from "./changeBlankRepresentedLetter";
import { createGame } from "./createGame";
import { placeTile } from "./placeTile";

function currentPlayer(state: GameState): Player {
  return state.players.find((p) => p.id === state.currentPlayerId)!;
}

function gameWithPendingBlank() {
  let state = createGame({
    playerOneName: "Alice",
    playerTwoName: "Bob",
    rackSize: 7,
  });
  const blankTileId = Object.values(state.tiles).find(
    (t) => t.kind === "BLANK",
  )!.id;
  state = relocateTileToRack(state, state.currentPlayerId, blankTileId);
  const placed = placeTile(state, SCRABBLE_BOARD_DEFINITION, SWEDISH_ALPHABET, {
    playerId: state.currentPlayerId,
    tileId: blankTileId,
    coordinate: SCRABBLE_BOARD_DEFINITION.centreCoordinate,
    representedLetter: "A",
  });
  if (!placed.success) throw new Error("setup failed");
  return { state: placed.state, blankTileId };
}

describe("changeBlankRepresentedLetter", () => {
  it("changes the represented letter while the tile is still pending", () => {
    const { state, blankTileId } = gameWithPendingBlank();

    const result = changeBlankRepresentedLetter(state, SWEDISH_ALPHABET, {
      playerId: state.currentPlayerId,
      tileId: blankTileId,
      representedLetter: "Q",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove?.placedTiles[0].representedLetter).toBe(
      "Q",
    );
  });

  it("rejects an invalid letter", () => {
    const { state, blankTileId } = gameWithPendingBlank();

    const result = changeBlankRepresentedLetter(state, SWEDISH_ALPHABET, {
      playerId: state.currentPlayerId,
      tileId: blankTileId,
      representedLetter: "9",
    });

    expect(result).toEqual({
      success: false,
      error: { code: "INVALID_BLANK_LETTER", messageKey: "invalidBlankLetter" },
    });
  });

  it("rejects changing the letter of a tile that is not pending", () => {
    const { state } = gameWithPendingBlank();
    const someOtherTileId = currentPlayer(state).rack.tileIds[0];

    const result = changeBlankRepresentedLetter(state, SWEDISH_ALPHABET, {
      playerId: state.currentPlayerId,
      tileId: someOtherTileId,
      representedLetter: "A",
    });

    expect(result).toEqual({
      success: false,
      error: { code: "INVALID_TILE", messageKey: "tileNotPending" },
    });
  });

  it("rejects changing the letter of a pending non-blank tile", () => {
    const state = createGame({
      playerOneName: "Alice",
      playerTwoName: "Bob",
      rackSize: 7,
    });
    const [tileId] = letterTileIdsInRack(state, state.currentPlayerId);
    const placed = placeTile(
      state,
      SCRABBLE_BOARD_DEFINITION,
      SWEDISH_ALPHABET,
      {
        playerId: state.currentPlayerId,
        tileId,
        coordinate: SCRABBLE_BOARD_DEFINITION.centreCoordinate,
      },
    );
    if (!placed.success) throw new Error("setup failed");

    const result = changeBlankRepresentedLetter(
      placed.state,
      SWEDISH_ALPHABET,
      {
        playerId: state.currentPlayerId,
        tileId,
        representedLetter: "A",
      },
    );

    expect(result).toEqual({
      success: false,
      error: { code: "INVALID_TILE", messageKey: "tileNotBlank" },
    });
  });

  it("rejects re-lettering a replace-placed blank to the letter it displaced (DEC-015)", () => {
    const setup = buildEngineTestGame({
      playerOneRackLetters: ["_", "I", "L"],
    });
    const existingTileId = createTileId();
    setup.tiles[existingTileId] = createLetterTile(existingTileId, "B", 1);
    const centre = setup.board.centreCoordinate;
    const board = placeCommittedTile(setup.state.board, centre, existingTileId);
    const [blankId] = setup.state.players[0].rack.tileIds;

    const placed = placeTile(
      { ...setup.state, board },
      setup.board,
      SWEDISH_ALPHABET,
      {
        playerId: setup.playerOneId,
        tileId: blankId,
        coordinate: centre,
        representedLetter: "C",
      },
      { allowReplace: true },
    );
    if (!placed.success) throw new Error("setup failed");

    const result = changeBlankRepresentedLetter(
      placed.state,
      SWEDISH_ALPHABET,
      {
        playerId: setup.playerOneId,
        tileId: blankId,
        representedLetter: "B",
      },
    );

    expect(result).toEqual({
      success: false,
      error: { code: "REPLACE_SAME_LETTER", messageKey: "replaceSameLetter" },
    });
  });
});
