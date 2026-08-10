type Brand<T, B extends string> = T & { readonly __brand: B };

export type GameId = Brand<string, "GameId">;
export type PlayerId = Brand<string, "PlayerId">;
export type TileId = Brand<string, "TileId">;
export type HistoryEventId = Brand<string, "HistoryEventId">;

function generateId(): string {
  return crypto.randomUUID();
}

export function createGameId(): GameId {
  return generateId() as GameId;
}

export function createPlayerId(): PlayerId {
  return generateId() as PlayerId;
}

export function createTileId(): TileId {
  return generateId() as TileId;
}

export function createHistoryEventId(): HistoryEventId {
  return generateId() as HistoryEventId;
}
