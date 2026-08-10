import type { TileId } from "./ids";

export interface TileBag {
  readonly tileIds: readonly TileId[];
}

/** Returns a float in [0, 1), like `Math.random`. Inject a seeded source for deterministic tests. */
export type RandomSource = () => number;

export function createTileBag(tileIds: readonly TileId[]): TileBag {
  return { tileIds: [...tileIds] };
}

export function shuffleTileBag(
  bag: TileBag,
  randomSource: RandomSource = Math.random,
): TileBag {
  const shuffled = [...bag.tileIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randomSource() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { tileIds: shuffled };
}

export interface DrawResult {
  readonly bag: TileBag;
  readonly drawn: readonly TileId[];
}

export function drawTiles(bag: TileBag, count: number): DrawResult {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(
      `Draw count must be a non-negative integer, received ${count}`,
    );
  }
  const drawn = bag.tileIds.slice(0, count);
  const remaining = bag.tileIds.slice(drawn.length);
  return { bag: { tileIds: remaining }, drawn };
}
