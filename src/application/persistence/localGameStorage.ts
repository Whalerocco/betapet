import { SWEDISH_CONFIGURATION_ID } from "../../game/configuration/swedishConfiguration";
import { assertValidGameState, type GameState } from "../../game/model/game";
import type { RackSize } from "../../game/model/gameConfiguration";
import {
  ALL_LANGUAGE_CODES,
  type LanguageCode,
} from "../../game/model/language";
import {
  ALL_MODIFIER_IDS,
  type ModifierId,
} from "../../game/model/modifiers";

const STORAGE_KEY = "betapet:local-game";

/**
 * Bumped whenever the persisted shape changes in a way that could make an older save
 * unsafe to load (tech-stack.md section 22-23, local-multiplayer.md section 29).
 * v2 added `modifiers`; v3 adds `polyglotLanguages`/`wildLanguages`. An older save has no
 * reliable way to know these values (if any), so it is treated as INCOMPATIBLE rather than
 * silently assumed to have none.
 */
const SCHEMA_VERSION = 3;

export interface SavedLocalGame {
  readonly schemaVersion: number;
  readonly configurationId: string;
  readonly rackSize: RackSize;
  /** Serialized as an array — `Set` is not JSON-serializable (tasks.md section 37). */
  readonly modifiers: readonly ModifierId[];
  /** Ordered per ALL_LANGUAGE_CODES; only meaningful when modifiers has "POLYGLOT". */
  readonly polyglotLanguages: readonly LanguageCode[];
  /** Wild mode's rotation order; only meaningful when modifiers has "WILD". */
  readonly wildLanguages: readonly LanguageCode[];
  readonly savedAt: string;
  readonly gameState: GameState;
}

function hasLocalStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function isLanguageCodeArray(value: unknown): value is readonly LanguageCode[] {
  return (
    Array.isArray(value) &&
    value.every(
      (code): code is LanguageCode =>
        typeof code === "string" &&
        (ALL_LANGUAGE_CODES as readonly string[]).includes(code),
    )
  );
}

/**
 * Persists the entire authoritative GameState (local-multiplayer.md section 27-28): pending
 * placements and awaiting-review state are already fields of GameState, so persisting the
 * whole state after every action covers both without special-casing action types.
 */
export function saveLocalGame(
  state: GameState,
  rackSize: RackSize,
  modifiers: ReadonlySet<ModifierId>,
  polyglotLanguages: readonly LanguageCode[] = [],
  wildLanguages: readonly LanguageCode[] = [],
): void {
  if (!hasLocalStorage()) return;
  const saved: SavedLocalGame = {
    schemaVersion: SCHEMA_VERSION,
    configurationId: state.configurationId,
    rackSize,
    modifiers: Array.from(modifiers),
    polyglotLanguages,
    wildLanguages,
    savedAt: new Date().toISOString(),
    gameState: state,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Best-effort: quota exceeded or storage disabled (e.g. private browsing) shouldn't crash play.
  }
}

export function clearLocalGame(): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function isPlausibleSavedLocalGame(
  value: unknown,
): value is Pick<
  SavedLocalGame,
  | "schemaVersion"
  | "configurationId"
  | "rackSize"
  | "modifiers"
  | "polyglotLanguages"
  | "wildLanguages"
  | "gameState"
> {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.schemaVersion === "number" &&
    typeof candidate.configurationId === "string" &&
    typeof candidate.rackSize === "number" &&
    Array.isArray(candidate.modifiers) &&
    candidate.modifiers.every(
      (id): id is ModifierId =>
        typeof id === "string" &&
        (ALL_MODIFIER_IDS as readonly string[]).includes(id),
    ) &&
    isLanguageCodeArray(candidate.polyglotLanguages) &&
    isLanguageCodeArray(candidate.wildLanguages) &&
    typeof candidate.gameState === "object" &&
    candidate.gameState !== null
  );
}

export type LoadLocalGameResult =
  | { readonly status: "NONE" }
  | {
      readonly status: "LOADED";
      readonly state: GameState;
      readonly rackSize: RackSize;
      readonly modifiers: ReadonlySet<ModifierId>;
      readonly polyglotLanguages: readonly LanguageCode[];
      readonly wildLanguages: readonly LanguageCode[];
    }
  | { readonly status: "INCOMPATIBLE" };

/**
 * Loads and validates the saved game (local-multiplayer.md section 34): never throws, never
 * attempts a partial/best-guess reconstruction. Anything that doesn't check out — corrupt
 * JSON, a schema/configuration mismatch, or a structurally invalid GameState — is reported as
 * INCOMPATIBLE so the caller can explain that the save couldn't be restored and start fresh.
 */
export function loadLocalGame(): LoadLocalGameResult {
  if (!hasLocalStorage()) return { status: "NONE" };

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return { status: "NONE" };
  }
  if (!raw) return { status: "NONE" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "INCOMPATIBLE" };
  }

  if (!isPlausibleSavedLocalGame(parsed)) {
    return { status: "INCOMPATIBLE" };
  }
  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    return { status: "INCOMPATIBLE" };
  }
  if (parsed.configurationId !== SWEDISH_CONFIGURATION_ID) {
    return { status: "INCOMPATIBLE" };
  }

  try {
    assertValidGameState(parsed.gameState);
  } catch {
    return { status: "INCOMPATIBLE" };
  }

  return {
    status: "LOADED",
    state: parsed.gameState,
    rackSize: parsed.rackSize as RackSize,
    modifiers: new Set(parsed.modifiers),
    polyglotLanguages: parsed.polyglotLanguages,
    wildLanguages: parsed.wildLanguages,
  };
}
