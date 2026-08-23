import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createGameId,
  createHistoryEventId,
  createPlayerId,
  createTileId,
} from "./ids";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Simulates an insecure context (plain HTTP on a LAN address), where `crypto.randomUUID` is not
 * exposed but `crypto.getRandomValues` still is.
 */
function withoutRandomUUID(): void {
  vi.stubGlobal("crypto", {
    getRandomValues: crypto.getRandomValues.bind(crypto),
  });
}

describe("id generation", () => {
  it("produces distinct version-4 UUIDs for every id type", () => {
    const ids = [
      createGameId(),
      createPlayerId(),
      createTileId(),
      createHistoryEventId(),
    ];

    for (const id of ids) {
      expect(id).toMatch(UUID_PATTERN);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("still generates ids where crypto.randomUUID is unavailable", () => {
    // Regression (known-bugs.md, in general 3): in an insecure context the missing
    // crypto.randomUUID threw inside the start-game handler, so the button silently did nothing.
    withoutRandomUUID();

    const ids = Array.from({ length: 50 }, () => createTileId());

    for (const id of ids) {
      expect(id).toMatch(UUID_PATTERN);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});
