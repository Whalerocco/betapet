import type { BoardDefinition } from "./board";
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
}

export function createGameConfiguration(
  id: string,
  language: string,
  boardDefinition: BoardDefinition,
  rackSize: RackSize,
  modifiers: ReadonlySet<ModifierId> = new Set(),
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
  return { id, language, boardDefinition, rackSize, modifiers };
}
