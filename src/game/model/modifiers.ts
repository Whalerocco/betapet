/**
 * Optional gameplay modifiers a game can be configured with at setup (game-modifiers.md).
 * POLYGLOT and WILD are specified there but require more than one configured language to have
 * any effect, so they are not implemented until roadmap Milestone 8.1 — only the three
 * modifiers roadmap Milestone 4.5 introduces are represented here.
 */
export type ModifierId = "CRISSCROSS" | "REPLACE" | "ILLEGAL";

export const ALL_MODIFIER_IDS: readonly ModifierId[] = [
  "CRISSCROSS",
  "REPLACE",
  "ILLEGAL",
];

export type ModifierCompatibility =
  | "COMPATIBLE"
  | "COMPATIBLE_WITH_INTERACTION"
  | "UNDECIDED";

function pairKey(a: ModifierId, b: ModifierId): string {
  return [a, b].sort().join("|");
}

/**
 * Mirrors the compatibility matrix in game-modifiers.md section 5. Only pairs that are not
 * plain COMPATIBLE are listed; an unlisted pair defaults to COMPATIBLE. When Milestone 8.1 adds
 * POLYGLOT/WILD, their UNDECIDED pair (and any others their addition introduces) must be added
 * here — this map is the single source of truth game-modifiers.md section 5 describes, not just
 * a UI-level restriction.
 */
const COMPATIBILITY_OVERRIDES: ReadonlyMap<string, ModifierCompatibility> =
  new Map([[pairKey("CRISSCROSS", "REPLACE"), "COMPATIBLE_WITH_INTERACTION"]]);

export function compatibilityOf(
  a: ModifierId,
  b: ModifierId,
): ModifierCompatibility {
  if (a === b) return "COMPATIBLE";
  return COMPATIBILITY_OVERRIDES.get(pairKey(a, b)) ?? "COMPATIBLE";
}

export interface ModifierConflict {
  readonly a: ModifierId;
  readonly b: ModifierId;
}

export type ModifierSelectionValidation =
  | { readonly valid: true }
  | { readonly valid: false; readonly conflicts: readonly ModifierConflict[] };

/**
 * Validates a modifier selection at game-configuration time. Must be called here — by the
 * engine, when a game is actually created — not only relied upon as a UI-level restriction that
 * disables incompatible checkboxes, per game-modifiers.md section 5.
 */
export function validateModifierSelection(
  selected: ReadonlySet<ModifierId> | readonly ModifierId[],
): ModifierSelectionValidation {
  const list = Array.from(new Set(selected));
  const conflicts: ModifierConflict[] = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (compatibilityOf(list[i], list[j]) === "UNDECIDED") {
        conflicts.push({ a: list[i], b: list[j] });
      }
    }
  }
  return conflicts.length === 0 ? { valid: true } : { valid: false, conflicts };
}

export function hasModifier(
  modifiers: ReadonlySet<ModifierId>,
  id: ModifierId,
): boolean {
  return modifiers.has(id);
}
