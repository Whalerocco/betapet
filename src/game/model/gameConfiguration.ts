import type { BoardDefinition } from "./board";
import type { LanguageCode } from "./language";
import {
  validateModifierSelection,
  type ModifierId,
} from "./modifiers";

export type RackSize = 6 | 7 | 8;

export interface GameConfiguration {
  readonly id: string;
  readonly language: string;
  readonly boardDefinition: BoardDefinition;
  readonly rackSize: RackSize;
  /** Opt-in gameplay modifiers (game-modifiers.md); empty for the standard rule set. */
  readonly modifiers: ReadonlySet<ModifierId>;
  /**
   * Selected languages for Polyglot mode (game-modifiers.md section 9) — a word is valid if it
   * exists in any of these. Only meaningful when `modifiers` has "POLYGLOT"; ignored otherwise.
   * Per content-model.md section 8, this is modifier-specific settings carried alongside
   * `modifiers`, not a change to the single `language` field above (which keeps meaning the
   * game's base/UI language).
   */
  readonly polyglotLanguages: readonly LanguageCode[];
  /**
   * Ordered list of selected languages for Wild mode (game-modifiers.md section 10) — the active
   * validating language rotates through this list every full round. Order matters, unlike
   * `polyglotLanguages`. Only meaningful when `modifiers` has "WILD"; ignored otherwise.
   */
  readonly wildLanguages: readonly LanguageCode[];
}

export function createGameConfiguration(
  id: string,
  language: string,
  boardDefinition: BoardDefinition,
  rackSize: RackSize,
  modifiers: ReadonlySet<ModifierId> = new Set(),
  polyglotLanguages: readonly LanguageCode[] = [],
  wildLanguages: readonly LanguageCode[] = [],
): GameConfiguration {
  if (id.trim().length === 0) {
    throw new Error("Configuration id must not be empty");
  }
  if (language.trim().length === 0) {
    throw new Error("Language must not be empty");
  }
  const validation = validateModifierSelection(modifiers);
  if (!validation.valid) {
    const [{ a, b }] = validation.conflicts;
    throw new Error(
      `Modifiers ${a} and ${b} cannot be combined yet (game-modifiers.md section 5)`,
    );
  }
  if (modifiers.has("POLYGLOT") && polyglotLanguages.length < 2) {
    throw new Error(
      "Polyglot mode requires at least two selected languages (game-modifiers.md section 9)",
    );
  }
  if (modifiers.has("WILD") && wildLanguages.length < 2) {
    throw new Error(
      "Wild mode requires at least two selected languages (game-modifiers.md section 10)",
    );
  }
  return {
    id,
    language,
    boardDefinition,
    rackSize,
    modifiers,
    polyglotLanguages,
    wildLanguages,
  };
}
