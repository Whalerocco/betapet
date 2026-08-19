import { describe, expect, it } from "vitest";
import { createTileId } from "./ids";
import {
  createBoardDefinition,
  createBoardState,
  getMultiplierAt,
  getTileIdAt,
  isOccupied,
  placeCommittedTile,
  removeCommittedTile,
} from "./board";

describe("createBoardDefinition", () => {
  it("creates a valid board definition", () => {
    const definition = createBoardDefinition(15, 15, { row: 7, column: 7 }, [
      { coordinate: { row: 7, column: 7 }, multiplier: "START" },
    ]);
    expect(definition.width).toBe(15);
    expect(definition.height).toBe(15);
  });

  it("rejects a centre coordinate outside the board", () => {
    expect(() =>
      createBoardDefinition(15, 15, { row: 20, column: 20 }, []),
    ).toThrow();
  });

  it("rejects a cell coordinate outside the board", () => {
    expect(() =>
      createBoardDefinition(15, 15, { row: 7, column: 7 }, [
        { coordinate: { row: 99, column: 99 }, multiplier: "WORD_X2" },
      ]),
    ).toThrow();
  });

  it("rejects duplicate cell definitions", () => {
    expect(() =>
      createBoardDefinition(15, 15, { row: 7, column: 7 }, [
        { coordinate: { row: 0, column: 0 }, multiplier: "WORD_X2" },
        { coordinate: { row: 0, column: 0 }, multiplier: "WORD_X3" },
      ]),
    ).toThrow();
  });
});

describe("getMultiplierAt", () => {
  it("returns the configured multiplier", () => {
    const definition = createBoardDefinition(15, 15, { row: 7, column: 7 }, [
      { coordinate: { row: 0, column: 0 }, multiplier: "WORD_X3" },
    ]);
    expect(getMultiplierAt(definition, { row: 0, column: 0 })).toBe("WORD_X3");
  });

  it("defaults to NONE for an unconfigured cell", () => {
    const definition = createBoardDefinition(15, 15, { row: 7, column: 7 }, []);
    expect(getMultiplierAt(definition, { row: 3, column: 3 })).toBe("NONE");
  });
});

describe("board state occupancy", () => {
  it("starts empty", () => {
    const state = createBoardState();
    expect(isOccupied(state, { row: 0, column: 0 })).toBe(false);
  });

  it("places a committed tile", () => {
    const tileId = createTileId();
    const state = placeCommittedTile(
      createBoardState(),
      { row: 3, column: 4 },
      tileId,
    );
    expect(getTileIdAt(state, { row: 3, column: 4 })).toBe(tileId);
  });

  it("prevents a second committed tile on the same cell", () => {
    const state = placeCommittedTile(
      createBoardState(),
      { row: 3, column: 4 },
      createTileId(),
    );
    expect(() =>
      placeCommittedTile(state, { row: 3, column: 4 }, createTileId()),
    ).toThrow();
  });

  it("does not mutate the original state", () => {
    const original = createBoardState();
    placeCommittedTile(original, { row: 0, column: 0 }, createTileId());
    expect(isOccupied(original, { row: 0, column: 0 })).toBe(false);
  });
});

describe("removeCommittedTile", () => {
  it("vacates a previously occupied cell", () => {
    const placed = placeCommittedTile(
      createBoardState(),
      { row: 3, column: 4 },
      createTileId(),
    );
    const removed = removeCommittedTile(placed, { row: 3, column: 4 });
    expect(isOccupied(removed, { row: 3, column: 4 })).toBe(false);
  });

  it("leaves other occupied cells untouched", () => {
    let state = placeCommittedTile(
      createBoardState(),
      { row: 3, column: 4 },
      createTileId(),
    );
    const otherTileId = createTileId();
    state = placeCommittedTile(state, { row: 5, column: 5 }, otherTileId);

    const removed = removeCommittedTile(state, { row: 3, column: 4 });

    expect(getTileIdAt(removed, { row: 5, column: 5 })).toBe(otherTileId);
  });

  it("throws when the cell is not occupied", () => {
    expect(() =>
      removeCommittedTile(createBoardState(), { row: 0, column: 0 }),
    ).toThrow();
  });

  it("does not mutate the original state", () => {
    const placed = placeCommittedTile(
      createBoardState(),
      { row: 0, column: 0 },
      createTileId(),
    );
    removeCommittedTile(placed, { row: 0, column: 0 });
    expect(isOccupied(placed, { row: 0, column: 0 })).toBe(true);
  });
});
