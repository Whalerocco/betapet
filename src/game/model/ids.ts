type Brand<T, B extends string> = T & { readonly __brand: B };

export type GameId = Brand<string, "GameId">;
export type PlayerId = Brand<string, "PlayerId">;
export type TileId = Brand<string, "TileId">;
export type HistoryEventId = Brand<string, "HistoryEventId">;

/**
 * `crypto.randomUUID` is exposed only in a secure context, which HTTPS and `localhost` satisfy
 * but a plain-HTTP LAN address (`http://192.168.x.x:3000`) does not — and opening the app that
 * way to play a hot-seat game on a phone is an ordinary thing to do. Calling the missing function
 * threw inside the "start game" handler, so the button did nothing at all, with no error shown.
 *
 * `crypto.getRandomValues` carries no such restriction, so build the same RFC 4122 version-4
 * UUID from it whenever the one-shot helper isn't there. Ids stay equally unguessable; only the
 * assembly differs.
 */
function generateId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4.
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx.
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
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
