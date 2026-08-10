import { createTileId, type TileId } from "../model/ids";
import {
  createBlankTile,
  createLetterTile,
  type Tile,
  type TileDefinition,
} from "../model/tile";

export interface TileInstances {
  readonly tiles: Readonly<Record<TileId, Tile>>;
  readonly tileIds: readonly TileId[];
}

/** Expands static tile definitions (letter/count/points) into individually identified physical tiles. */
export function createTileInstances(
  definitions: readonly TileDefinition[],
): TileInstances {
  const tiles: Record<TileId, Tile> = {};
  const tileIds: TileId[] = [];

  for (const definition of definitions) {
    for (let i = 0; i < definition.count; i++) {
      const id = createTileId();
      tiles[id] =
        definition.kind === "LETTER"
          ? createLetterTile(id, definition.letter, definition.points)
          : createBlankTile(id);
      tileIds.push(id);
    }
  }

  return { tiles, tileIds };
}
