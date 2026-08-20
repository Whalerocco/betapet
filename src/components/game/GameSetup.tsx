"use client";

import { useState, type FormEvent } from "react";
import { ALL_TILES_BONUS_BY_RACK_SIZE } from "../../game/configuration/allTilesBonus";
import type { RackSize } from "../../game/model/gameConfiguration";
import {
  ALL_LANGUAGE_CODES,
  type LanguageCode,
} from "../../game/model/language";
import {
  compatibilityOf,
  validateModifierSelection,
  type ModifierId,
} from "../../game/model/modifiers";
import styles from "./GameSetup.module.css";
import { LANGUAGE_NAMES } from "./languageNames";
import { MODIFIER_COPY } from "./modifierCopy";

export interface GameSetupValues {
  readonly playerOneName: string;
  readonly playerTwoName: string;
  readonly rackSize: RackSize;
  readonly modifiers: ReadonlySet<ModifierId>;
  /** Ordered per ALL_LANGUAGE_CODES; only meaningful when modifiers has "POLYGLOT". */
  readonly polyglotLanguages: readonly LanguageCode[];
  /** Ordered per ALL_LANGUAGE_CODES (Wild's rotation order); only meaningful when modifiers has "WILD". */
  readonly wildLanguages: readonly LanguageCode[];
}

export interface GameSetupProps {
  /** May return a Promise: starting a Polyglot/Wild game loads extra dictionaries first. */
  readonly onStartGame: (values: GameSetupValues) => void | Promise<void>;
}

const RACK_SIZES: readonly RackSize[] = [6, 7, 8];

const ALL_UI_MODIFIER_IDS: readonly ModifierId[] = [
  "CRISSCROSS",
  "REPLACE",
  "ILLEGAL",
  "POLYGLOT",
  "WILD",
];

/** Modifiers whose setup UI needs a language picker (game-modifiers.md sections 9-10). */
const LANGUAGE_SELECTING_MODIFIER_IDS = new Set<ModifierId>([
  "POLYGLOT",
  "WILD",
]);

/** Languages offered beyond Swedish, which is always included (DEC-010/DEC-011). */
const ADDITIONAL_LANGUAGE_CODES: readonly LanguageCode[] =
  ALL_LANGUAGE_CODES.filter((code) => code !== "sv");

function languagePickerLabel(id: ModifierId): string | undefined {
  if (id === "POLYGLOT") return "Välj språk för flerspråksläge";
  if (id === "WILD") return "Välj språk för roterande språkläge (ordning: " +
    ALL_LANGUAGE_CODES.map((code) => LANGUAGE_NAMES[code]).join(", ") +
    ")";
  return undefined;
}

/** Collects only what the game rules require to start (ui-design.md section 6). */
export function GameSetup({ onStartGame }: GameSetupProps) {
  const [playerOneName, setPlayerOneName] = useState("");
  const [playerTwoName, setPlayerTwoName] = useState("");
  const [rackSize, setRackSize] = useState<RackSize>(7);
  const [modifiers, setModifiers] = useState<ReadonlySet<ModifierId>>(
    new Set(),
  );
  const [polyglotLanguages, setPolyglotLanguages] = useState<
    ReadonlySet<LanguageCode>
  >(new Set(["sv"]));
  const [wildLanguages, setWildLanguages] = useState<ReadonlySet<LanguageCode>>(
    new Set(["sv"]),
  );
  const [error, setError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function conflictsWithSelection(id: ModifierId): boolean {
    for (const other of modifiers) {
      if (other !== id && compatibilityOf(id, other) === "UNDECIDED") {
        return true;
      }
    }
    return false;
  }

  function toggleModifier(id: ModifierId) {
    setModifiers((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleLanguage(
    setter: React.Dispatch<React.SetStateAction<ReadonlySet<LanguageCode>>>,
    code: LanguageCode,
  ) {
    setter((current) => {
      const next = new Set(current);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedOne = playerOneName.trim();
    const trimmedTwo = playerTwoName.trim();
    if (trimmedOne.length === 0 || trimmedTwo.length === 0) {
      setError("Ange namn för båda spelarna.");
      return;
    }
    if (!validateModifierSelection(modifiers).valid) {
      setError("Denna kombination av spellägen kan inte användas ännu.");
      return;
    }
    if (modifiers.has("POLYGLOT") && polyglotLanguages.size < 2) {
      setError("Välj minst ett språk utöver svenska för flerspråksläge.");
      return;
    }
    if (modifiers.has("WILD") && wildLanguages.size < 2) {
      setError("Välj minst ett språk utöver svenska för roterande språkläge.");
      return;
    }
    setError(undefined);

    const values: GameSetupValues = {
      playerOneName: trimmedOne,
      playerTwoName: trimmedTwo,
      rackSize,
      modifiers,
      polyglotLanguages: modifiers.has("POLYGLOT")
        ? ALL_LANGUAGE_CODES.filter((code) => polyglotLanguages.has(code))
        : [],
      wildLanguages: modifiers.has("WILD")
        ? ALL_LANGUAGE_CODES.filter((code) => wildLanguages.has(code))
        : [],
    };

    const maybePromise = onStartGame(values);
    if (maybePromise) {
      setIsSubmitting(true);
      maybePromise.finally(() => setIsSubmitting(false));
    }
  }

  return (
    <form className={styles.setup} onSubmit={handleSubmit}>
      <h1>Nytt spel</h1>

      <label className={styles.field}>
        Spelare 1
        <input
          type="text"
          value={playerOneName}
          onChange={(event) => setPlayerOneName(event.target.value)}
          maxLength={40}
        />
      </label>

      <label className={styles.field}>
        Spelare 2
        <input
          type="text"
          value={playerTwoName}
          onChange={(event) => setPlayerTwoName(event.target.value)}
          maxLength={40}
        />
      </label>

      <fieldset className={styles.field}>
        <legend>Antal brickor</legend>
        {RACK_SIZES.map((size) => (
          <label key={size} className={styles.radioOption}>
            <input
              type="radio"
              name="rackSize"
              value={size}
              checked={rackSize === size}
              onChange={() => setRackSize(size)}
            />
            {size} brickor → {ALL_TILES_BONUS_BY_RACK_SIZE[size]} bonuspoäng
          </label>
        ))}
      </fieldset>

      <fieldset className={styles.field}>
        <legend>Spellägen</legend>
        {ALL_UI_MODIFIER_IDS.map((id) => {
          const copy = MODIFIER_COPY[id];
          const checked = modifiers.has(id);
          const disabled = !checked && conflictsWithSelection(id);
          const pickerLegend = checked ? languagePickerLabel(id) : undefined;
          const languageState =
            id === "POLYGLOT" ? polyglotLanguages : wildLanguages;
          const languageSetter =
            id === "POLYGLOT" ? setPolyglotLanguages : setWildLanguages;
          return (
            <div key={id} className={styles.modifierRow}>
              <label className={styles.checkboxOption} aria-disabled={disabled}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
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
                          onChange={() => toggleLanguage(languageSetter, code)}
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

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <button type="submit" className={styles.primary} disabled={isSubmitting}>
        {isSubmitting ? "Förbereder spelet…" : "Starta spel"}
      </button>
    </form>
  );
}
