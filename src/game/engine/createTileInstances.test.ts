import { describe, expect, it } from "vitest";
import { SWEDISH_SCRABBLE_TILE_DEFINITIONS } from "../../data/tiles/swedishScrabbleTiles";
import { createTileInstances } from "./createTileInstances";

describe("createTileInstances", () => {
  it("expands the configured distribution into 100 individually identified tiles", () => {
    const { tileIds, tiles } = createTileInstances(
      SWEDISH_SCRABBLE_TILE_DEFINITIONS,
    );
    expect(tileIds).toHaveLength(100);
    expect(new Set(tileIds).size).toBe(100);
    expect(Object.keys(tiles)).toHaveLength(100);
  });

  it("preserves each definition's letter and points on every instance", () => {
    const { tiles, tileIds } = createTileInstances([
      { kind: "LETTER", letter: "K", points: 2, count: 3 },
    ]);
    expect(tileIds).toHaveLength(3);
    for (const id of tileIds) {
      const tile = tiles[id];
      expect(tile.kind).toBe("LETTER");
      if (tile.kind === "LETTER") {
        expect(tile.letter).toBe("K");
        expect(tile.points).toBe(2);
      }
    }
  });

  it("creates blank instances with no represented letter yet", () => {
    const { tiles, tileIds } = createTileInstances([
      { kind: "BLANK", points: 0, count: 2 },
    ]);
    expect(tileIds).toHaveLength(2);
    for (const id of tileIds) {
      const tile = tiles[id];
      expect(tile.kind).toBe("BLANK");
      expect(tile.points).toBe(0);
      if (tile.kind === "BLANK") {
        expect(tile.representedLetter).toBeUndefined();
      }
    }
  });
});
