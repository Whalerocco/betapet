import { describe, expect, it } from "vitest";
import { createPlayerId, createTileId } from "./ids";
import {
  createPendingMove,
  determinePlacementOrientation,
} from "./pendingMove";

describe("createPendingMove", () => {
  it("starts in EDITING status", () => {
    const move = createPendingMove(createPlayerId(), []);
    expect(move.status).toBe("EDITING");
  });

  it("is associated with the proposing player", () => {
    const playerId = createPlayerId();
    const move = createPendingMove(playerId, []);
    expect(move.playerId).toBe(playerId);
  });

  it("supports a represented letter for blank placements", () => {
    const tileId = createTileId();
    const move = createPendingMove(createPlayerId(), [
      { tileId, coordinate: { row: 7, column: 7 }, representedLetter: "Ö" },
    ]);
    expect(move.placedTiles[0].representedLetter).toBe("Ö");
  });

  it("rejects the same physical tile placed twice", () => {
    const tileId = createTileId();
    expect(() =>
      createPendingMove(createPlayerId(), [
        { tileId, coordinate: { row: 0, column: 0 } },
        { tileId, coordinate: { row: 0, column: 1 } },
      ]),
    ).toThrow();
  });

  it("rejects two tiles placed on the same coordinate", () => {
    expect(() =>
      createPendingMove(createPlayerId(), [
        { tileId: createTileId(), coordinate: { row: 0, column: 0 } },
        { tileId: createTileId(), coordinate: { row: 0, column: 0 } },
      ]),
    ).toThrow();
  });
});

describe("determinePlacementOrientation", () => {
  it("returns undefined for an empty placement", () => {
    expect(determinePlacementOrientation([])).toBeUndefined();
  });

  it("returns undefined for a single tile", () => {
    const placement = [
      { tileId: createTileId(), coordinate: { row: 3, column: 3 } },
    ];
    expect(determinePlacementOrientation(placement)).toBeUndefined();
  });

  it("detects a horizontal placement", () => {
    const placement = [
      { tileId: createTileId(), coordinate: { row: 3, column: 3 } },
      { tileId: createTileId(), coordinate: { row: 3, column: 4 } },
    ];
    expect(determinePlacementOrientation(placement)).toBe("HORIZONTAL");
  });

  it("detects a vertical placement", () => {
    const placement = [
      { tileId: createTileId(), coordinate: { row: 3, column: 3 } },
      { tileId: createTileId(), coordinate: { row: 4, column: 3 } },
    ];
    expect(determinePlacementOrientation(placement)).toBe("VERTICAL");
  });

  it("returns undefined for tiles that are not collinear", () => {
    const placement = [
      { tileId: createTileId(), coordinate: { row: 3, column: 3 } },
      { tileId: createTileId(), coordinate: { row: 4, column: 4 } },
    ];
    expect(determinePlacementOrientation(placement)).toBeUndefined();
  });
});
