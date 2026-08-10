import { describe, expect, it } from "vitest";
import { createTileId } from "./ids";
import { createTileBag, drawTiles, shuffleTileBag } from "./tileBag";

function sequentialSource(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("drawTiles", () => {
  it("reduces the bag by the drawn count", () => {
    const ids = [createTileId(), createTileId(), createTileId()];
    const bag = createTileBag(ids);
    const { bag: remaining, drawn } = drawTiles(bag, 2);
    expect(drawn).toHaveLength(2);
    expect(remaining.tileIds).toHaveLength(1);
  });

  it("cannot draw more physical tiles than exist", () => {
    const ids = [createTileId(), createTileId()];
    const bag = createTileBag(ids);
    const { bag: remaining, drawn } = drawTiles(bag, 5);
    expect(drawn).toHaveLength(2);
    expect(remaining.tileIds).toHaveLength(0);
    expect(new Set(drawn).size).toBe(2);
  });

  it("does not mutate the original bag", () => {
    const ids = [createTileId(), createTileId()];
    const bag = createTileBag(ids);
    drawTiles(bag, 1);
    expect(bag.tileIds).toHaveLength(2);
  });

  it("rejects a negative draw count", () => {
    expect(() => drawTiles(createTileBag([]), -1)).toThrow();
  });
});

describe("shuffleTileBag", () => {
  it("produces a deterministic order for a deterministic random source", () => {
    const ids = [
      createTileId(),
      createTileId(),
      createTileId(),
      createTileId(),
    ];
    const bag = createTileBag(ids);
    const shuffledA = shuffleTileBag(
      bag,
      sequentialSource([0.1, 0.9, 0.2, 0.5]),
    );
    const shuffledB = shuffleTileBag(
      bag,
      sequentialSource([0.1, 0.9, 0.2, 0.5]),
    );
    expect(shuffledA.tileIds).toEqual(shuffledB.tileIds);
  });

  it("preserves the same set of tile IDs", () => {
    const ids = [createTileId(), createTileId(), createTileId()];
    const bag = createTileBag(ids);
    const shuffled = shuffleTileBag(bag, sequentialSource([0.3, 0.6]));
    expect(new Set(shuffled.tileIds)).toEqual(new Set(ids));
  });
});
