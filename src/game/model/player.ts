import type { PlayerId, TileId } from "./ids";

export interface Rack {
  readonly tileIds: readonly TileId[];
}

export interface Player {
  readonly id: PlayerId;
  readonly name: string;
  readonly rack: Rack;
  readonly score: number;
}

export function createEmptyRack(): Rack {
  return { tileIds: [] };
}

export function addTileToRack(rack: Rack, tileId: TileId): Rack {
  if (rack.tileIds.includes(tileId)) {
    throw new Error(`Tile ${tileId} is already in the rack`);
  }
  return { tileIds: [...rack.tileIds, tileId] };
}

export function removeTileFromRack(rack: Rack, tileId: TileId): Rack {
  if (!rack.tileIds.includes(tileId)) {
    throw new Error(`Tile ${tileId} is not in the rack`);
  }
  return { tileIds: rack.tileIds.filter((id) => id !== tileId) };
}

export function createPlayer(id: PlayerId, name: string): Player {
  if (name.trim().length === 0) {
    throw new Error("Player name must not be empty");
  }
  return { id, name, rack: createEmptyRack(), score: 0 };
}
