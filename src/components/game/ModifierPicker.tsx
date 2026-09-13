"use client";

import {
  ALL_LANGUAGE_CODES,
  type LanguageCode,
} from "../../game/model/language";
import {
  compatibilityOf,
  validateModifierSelection,
  type ModifierId,
} from "../../game/model/modifiers";

import { LANGUAGE_NAMES } from "./languageNames";
import { MODIFIER_COPY } from "./modifierCopy";
import styles from "./ModifierPicker.module.css";

/**
 * Choosing the modifiers a game is played with (`game-modifiers.md`).
 *
 * Extracted from `GameSetup` when online matches needed the same choice (T28.4). The two setups
 * differ in everything around it — a hot-seat game collects two player names and starts
 * immediately, an online one names an opponent and sends an invitation — but the modifiers
 * themselves are the same rules with the same copy, the same compatibility table, and the same
 * language pickers. One component means the two cannot drift apart.
 *
 * It decides nothing: compatibility comes from the engine's own `compatibilityOf` and
 * `validateModifierSelection`, exactly as before, and this holds no state of its own.
 */

export interface ModifierSelection {
  readonly modifiers: ReadonlySet<ModifierId>;
  readonly polyglotLanguages: ReadonlySet<LanguageCode>;
  readonly wildLanguages: ReadonlySet<LanguageCode>;
}

/** Swedish is always included, so a language picker starts with it and asks for one more. */
export const EMPTY_MODIFIER_SELECTION: ModifierSelection = {
  modifiers: new Set(),
  polyglotLanguages: new Set(["sv"]),
  wildLanguages: new Set(["sv"]),
};

const ALL_UI_MODIFIER_IDS: readonly ModifierId[] = [
  "CRISSCROSS",
  "REPLACE",
  "ILLEGAL",
  "POLYGLOT",
  "WILD",
];

/** Modifiers whose setup UI needs a language picker (`game-modifiers.md` sections 9-10). */
const LANGUAGE_SELECTING_MODIFIER_IDS = new Set<ModifierId>([
  "POLYGLOT",
  "WILD",
]);

/** Languages offered beyond Swedish, which is always included (DEC-010/DEC-011). */
const ADDITIONAL_LANGUAGE_CODES: readonly LanguageCode[] =
  ALL_LANGUAGE_CODES.filter((code) => code !== "sv");

function languagePickerLabel(id: ModifierId): string | undefined {
  if (id === "POLYGLOT") return "Välj språk för flerspråksläge";
  if (id === "WILD") {
    return (
      "Välj språk för roterande språkläge (ordning: " +
      ALL_LANGUAGE_CODES.map((code) => LANGUAGE_NAMES[code]).join(", ") +
      ")"
    );
  }
  return undefined;
}

/**
 * What is wrong with a selection, in Swedish, or `undefined` when it can be played.
 *
 * Both setups check this before submitting, and the server checks the same rules again against
 * the engine when an online match is created — a screen is not where a rule is enforced.
 */
export function describeModifierProblem(
  selection: ModifierSelection,
): string | undefined {
  if (!validateModifierSelection(selection.modifiers).valid) {
    return "Denna kombination av spellägen kan inte användas ännu.";
  }
  if (
    selection.modifiers.has("POLYGLOT") &&
    selection.polyglotLanguages.size < 2
  ) {
    return "Välj minst ett språk utöver svenska för flerspråksläge.";
  }
  if (selection.modifiers.has("WILD") && selection.wildLanguages.size < 2) {
    return "Välj minst ett språk utöver svenska för roterande språkläge.";
  }
  return undefined;
}

/**
 * The selection as the three fields a `GameConfiguration` and the match API both take, with the
 * languages ordered per `ALL_LANGUAGE_CODES` — which is Wild's rotation order, so the order is
 * part of the rules rather than a detail of how they were clicked.
 */
export function toConfigurationFields(selection: ModifierSelection): {
  readonly modifiers: ReadonlySet<ModifierId>;
  readonly polyglotLanguages: readonly LanguageCode[];
  readonly wildLanguages: readonly LanguageCode[];
} {
  return {
    modifiers: selection.modifiers,
    polyglotLanguages: selection.modifiers.has("POLYGLOT")
      ? ALL_LANGUAGE_CODES.filter((code) =>
          selection.polyglotLanguages.has(code),
        )
      : [],
    wildLanguages: selection.modifiers.has("WILD")
      ? ALL_LANGUAGE_CODES.filter((code) => selection.wildLanguages.has(code))
      : [],
  };
}

export interface ModifierPickerProps {
  readonly selection: ModifierSelection;
  readonly onChange: (selection: ModifierSelection) => void;
  readonly disabled?: boolean;
}

export function ModifierPicker({
  selection,
  onChange,
  disabled,
}: ModifierPickerProps) {
  const { modifiers, polyglotLanguages, wildLanguages } = selection;

  function conflictsWithSelection(id: ModifierId): boolean {
    for (const other of modifiers) {
      if (other !== id && compatibilityOf(id, other) === "UNDECIDED") {
        return true;
      }
    }
    return false;
  }

  function toggleModifier(id: ModifierId) {
    const next = new Set(modifiers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...selection, modifiers: next });
  }

  function toggleLanguage(id: "POLYGLOT" | "WILD", code: LanguageCode) {
    const current = id === "POLYGLOT" ? polyglotLanguages : wildLanguages;
    const next = new Set(current);
    if (next.has(code)) next.delete(code);
    else next.add(code);

    onChange(
      id === "POLYGLOT"
        ? { ...selection, polyglotLanguages: next }
        : { ...selection, wildLanguages: next },
    );
  }

  const interactionNotes: string[] = [];
  for (let i = 0; i < ALL_UI_MODIFIER_IDS.length; i++) {
    for (let j = i + 1; j < ALL_UI_MODIFIER_IDS.length; j++) {
      const a = ALL_UI_MODIFIER_IDS[i];
      const b = ALL_UI_MODIFIER_IDS[j];
      if (
        modifiers.has(a) &&
        modifiers.has(b) &&
        compatibilityOf(a, b) === "COMPATIBLE_WITH_INTERACTION"
      ) {
        interactionNotes.push(
          `${MODIFIER_COPY[a].label} och ${MODIFIER_COPY[b].label} kan kombineras men samspelar på särskilda sätt.`,
        );
      }
    }
  }

  return (
    <fieldset className={styles.field}>
      <legend>Spellägen</legend>
      {ALL_UI_MODIFIER_IDS.map((id) => {
        const copy = MODIFIER_COPY[id];
        const checked = modifiers.has(id);
        const unavailable =
          disabled || (!checked && conflictsWithSelection(id));
        const pickerLegend = checked ? languagePickerLabel(id) : undefined;
        const languageState =
          id === "POLYGLOT" ? polyglotLanguages : wildLanguages;
        return (
          <div key={id} className={styles.modifierRow}>
            <label
              className={styles.checkboxOption}
              aria-disabled={unavailable}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={unavailable}
                onChange={() => toggleModifier(id)}
              />
              <span>
                <strong>{copy.label}</strong>
                <span className={styles.modifierDescription}>
                  {copy.description}
                </span>
              </span>
            </label>
            {LANGUAGE_SELECTING_MODIFIER_IDS.has(id) &&
              checked &&
              pickerLegend && (
                <fieldset className={styles.languagePicker}>
                  <legend>{pickerLegend}</legend>
                  {ADDITIONAL_LANGUAGE_CODES.map((code) => (
                    <label key={code} className={styles.radioOption}>
                      <input
                        type="checkbox"
                        checked={languageState.has(code)}
                        disabled={disabled}
                        onChange={() =>
                          toggleLanguage(id as "POLYGLOT" | "WILD", code)
                        }
                      />
                      {LANGUAGE_NAMES[code]}
                    </label>
                  ))}
                </fieldset>
              )}
          </div>
        );
      })}
      {interactionNotes.map((note) => (
        <p key={note} className={styles.modifierNote}>
          {note}
        </p>
      ))}
    </fieldset>
  );
}
