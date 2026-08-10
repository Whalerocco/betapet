import { describe, expect, it } from "vitest";
import { SCRABBLE_BOARD_DEFINITION } from "../../data/board/scrabbleBoard";
import { createBoardState, placeCommittedTile } from "../model/board";
import { createTileId } from "../model/ids";
import type { PendingPlacedTile } from "../model/pendingMove";
import { validatePhysicalPlacement } from "./physicalValidation";

function placed(row: number, column: number): PendingPlacedTile {
  return { tileId: createTileId(), coordinate: { row, column } };
}

/** A committed "KABEL" (5 letters) sitting at row 5, columns 5-9. */
function boardWithKabel() {
  let board = createBoardState();
  const columns = [5, 6, 7, 8, 9];
  for (const column of columns) {
    board = placeCommittedTile(board, { row: 5, column }, createTileId());
  }
  return board;
}

describe("validatePhysicalPlacement", () => {
  it("accepts a valid first move covering the centre", () => {
    const board = createBoardState();
    const centre = SCRABBLE_BOARD_DEFINITION.centreCoordinate;
    const result = validatePhysicalPlacement(board, SCRABBLE_BOARD_DEFINITION, [
      placed(centre.row, centre.column),
      placed(centre.row, centre.column + 1),
    ]);
    expect(result).toEqual({ valid: true });
  });

  it("rejects a first move that does not cover the centre", () => {
    const board = createBoardState();
    const result = validatePhysicalPlacement(board, SCRABBLE_BOARD_DEFINITION, [
      placed(0, 0),
      placed(0, 1),
    ]);
    expect(result).toEqual({
      valid: false,
      error: {
        code: "FIRST_MOVE_MUST_COVER_CENTER",
        messageKey: "firstMoveMustCoverCentre",
      },
    });
  });

  it("accepts a horizontal move extending from an existing tile", () => {
    const board = boardWithKabel();
    const result = validatePhysicalPlacement(board, SCRABBLE_BOARD_DEFINITION, [
      placed(5, 10),
      placed(5, 11),
    ]);
    expect(result).toEqual({ valid: true });
  });

  it("accepts a vertical move connecting to an existing tile", () => {
    const board = boardWithKabel();
    const result = validatePhysicalPlacement(board, SCRABBLE_BOARD_DEFINITION, [
      placed(6, 5),
      placed(7, 5),
    ]);
    expect(result).toEqual({ valid: true });
  });

  it("accepts a single-tile extension of an existing word", () => {
    const board = boardWithKabel();
    const result = validatePhysicalPlacement(board, SCRABBLE_BOARD_DEFINITION, [
      placed(5, 10),
    ]);
    expect(result).toEqual({ valid: true });
  });

  it("rejects a disconnected move", () => {
    const board = boardWithKabel();
    const result = validatePhysicalPlacement(board, SCRABBLE_BOARD_DEFINITION, [
      placed(0, 0),
      placed(0, 1),
    ]);
    expect(result).toEqual({
      valid: false,
      error: { code: "MOVE_NOT_CONNECTED", messageKey: "moveNotConnected" },
    });
  });

  it("rejects an illegal gap within the placed line", () => {
    const board = createBoardState();
    const centre = SCRABBLE_BOARD_DEFINITION.centreCoordinate;
    const result = validatePhysicalPlacement(board, SCRABBLE_BOARD_DEFINITION, [
      placed(centre.row, centre.column),
      placed(centre.row, centre.column + 2),
    ]);
    expect(result).toEqual({
      valid: false,
      error: { code: "INVALID_PLACEMENT", messageKey: "illegalGap" },
    });
  });

  it("rejects a collision with an already-committed tile", () => {
    const board = boardWithKabel();
    const result = validatePhysicalPlacement(board, SCRABBLE_BOARD_DEFINITION, [
      placed(5, 5),
      placed(5, 10),
    ]);
    expect(result).toEqual({
      valid: false,
      error: { code: "INVALID_PLACEMENT", messageKey: "cellOccupied" },
    });
  });

  it("rejects placing two tiles on the same coordinate", () => {
    const board = createBoardState();
    const centre = SCRABBLE_BOARD_DEFINITION.centreCoordinate;
    const result = validatePhysicalPlacement(board, SCRABBLE_BOARD_DEFINITION, [
      placed(centre.row, centre.column),
      placed(centre.row, centre.column),
    ]);
    expect(result.valid).toBe(false);
  });

  it("rejects an out-of-bounds coordinate", () => {
    const board = createBoardState();
    const result = validatePhysicalPlacement(board, SCRABBLE_BOARD_DEFINITION, [
      placed(-1, 0),
    ]);
    expect(result).toEqual({
      valid: false,
      error: { code: "INVALID_PLACEMENT", messageKey: "outOfBounds" },
    });
  });

  it("rejects tiles that are not in a single line", () => {
    const board = boardWithKabel();
    const result = validatePhysicalPlacement(board, SCRABBLE_BOARD_DEFINITION, [
      placed(6, 5),
      placed(6, 6),
      placed(7, 6),
    ]);
    expect(result).toEqual({
      valid: false,
      error: { code: "INVALID_PLACEMENT", messageKey: "notInLine" },
    });
  });

  it("rejects an empty placement", () => {
    const board = createBoardState();
    const result = validatePhysicalPlacement(
      board,
      SCRABBLE_BOARD_DEFINITION,
      [],
    );
    expect(result).toEqual({
      valid: false,
      error: { code: "INVALID_PLACEMENT", messageKey: "emptyPlacement" },
    });
  });

  it("accepts a word extension like KABEL -> ELKABEL", () => {
    const board = boardWithKabel();
    // Existing K at column 5; new E, L placed immediately to its left.
    const result = validatePhysicalPlacement(board, SCRABBLE_BOARD_DEFINITION, [
      placed(5, 3),
      placed(5, 4),
    ]);
    expect(result).toEqual({ valid: true });
  });

  it("accepts a crossing move that spans across an existing tile", () => {
    const board = boardWithKabel();
    // New vertical placement in column 7, both above and below the existing B at (5, 7):
    // the gap at row 5 is legally filled by the pre-existing tile, not a new one.
    const result = validatePhysicalPlacement(board, SCRABBLE_BOARD_DEFINITION, [
      placed(3, 7),
      placed(4, 7),
      placed(6, 7),
      placed(7, 7),
    ]);
    expect(result).toEqual({ valid: true });
  });

  it("rejects a crossing attempt with a genuine gap next to the shared tile", () => {
    const board = boardWithKabel();
    // Row 4 is left empty: a real gap, not bridged by row 5's existing tile.
    const result = validatePhysicalPlacement(board, SCRABBLE_BOARD_DEFINITION, [
      placed(3, 7),
      placed(6, 7),
      placed(7, 7),
    ]);
    expect(result).toEqual({
      valid: false,
      error: { code: "INVALID_PLACEMENT", messageKey: "illegalGap" },
    });
  });
});
