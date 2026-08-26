import { assertValidGameState, type GameState } from "./game";

/**
 * Turning a game into text and back, for anything that has to store one: the browser's saved game
 * today, and an authoritative server row once matches live online (`online-multiplayer.md`).
 *
 * These live in the engine rather than beside a particular storage mechanism so that every store
 * agrees on what a valid game is. A server must not have to restate the rule, or it can drift
 * from it — and a state that has been through storage is exactly where an invalid one would
 * appear.
 */
export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
}

/**
 * Validates an already-parsed value as a game state, returning `undefined` rather than throwing:
 * a corrupt or foreign record is an expected condition for a store, not an exceptional one, and
 * the caller decides what to tell the player.
 *
 * Validation is `assertValidGameState`, the same invariant check every engine action relies on,
 * so a state that is accepted here can be played on immediately.
 */
export function parseGameState(value: unknown): GameState | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  try {
    assertValidGameState(value as GameState);
  } catch {
    return undefined;
  }
  return value as GameState;
}

/** Reads a game state from its serialized text; `undefined` if the text is not one. */
export function deserializeGameState(json: string): GameState | undefined {
  try {
    return parseGameState(JSON.parse(json));
  } catch {
    return undefined;
  }
}
