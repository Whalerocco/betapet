"use client";

import { useState, type FormEvent } from "react";

import { ALL_TILES_BONUS_BY_RACK_SIZE } from "../../game/configuration/allTilesBonus";
import type { RackSize } from "../../game/model/gameConfiguration";
import {
  describeModifierProblem,
  EMPTY_MODIFIER_SELECTION,
  ModifierPicker,
  toConfigurationFields,
  type ModifierSelection,
} from "../game/ModifierPicker";

import styles from "./NewMatchScreen.module.css";

const RACK_SIZES: readonly RackSize[] = [6, 7, 8];

/** Who the invitation is for: somebody reached by address, or a friend already chosen. */
export type NewMatchOpponent =
  | { readonly kind: "EMAIL" }
  | {
      readonly kind: "FRIEND";
      readonly userId: string;
      readonly name: string;
      readonly handle: string;
    };

export interface NewMatchValues {
  /** Only when the opponent is named by address; a friend is already known to the caller. */
  readonly opponentEmail?: string;
  readonly rackSize: RackSize;
  readonly modifiers: readonly string[];
  readonly polyglotLanguages: readonly string[];
  readonly wildLanguages: readonly string[];
}

export interface NewMatchScreenProps {
  readonly opponent: NewMatchOpponent;
  readonly onCreate: (values: NewMatchValues) => void;
  readonly onCancel: () => void;
  readonly busy?: boolean;
  readonly error?: string;
}

/**
 * Choosing the rules for an online match before inviting somebody to it (T28.4).
 *
 * The same screen serves both ways in: from the match list, where an opponent is named by email
 * address, and from the friend list, where one is already chosen. Having one screen is the point
 * — two would be two places for the rules to be offered differently.
 *
 * The rules are the inviter's to choose, and the invitation shows them to the person deciding
 * whether to accept (DEC-029). Nothing here decides whether a combination is allowed: that is
 * `describeModifierProblem` from the shared picker, and the server asks the engine again.
 */
export function NewMatchScreen({
  opponent,
  onCreate,
  onCancel,
  busy,
  error,
}: NewMatchScreenProps) {
  const [opponentEmail, setOpponentEmail] = useState("");
  const [rackSize, setRackSize] = useState<RackSize>(7);
  const [selection, setSelection] = useState<ModifierSelection>(
    EMPTY_MODIFIER_SELECTION,
  );
  const [problem, setProblem] = useState<string | undefined>();

  function submit(event: FormEvent) {
    event.preventDefault();

    const complaint = describeModifierProblem(selection);
    if (complaint) {
      setProblem(complaint);
      return;
    }
    setProblem(undefined);

    const fields = toConfigurationFields(selection);
    onCreate({
      opponentEmail:
        opponent.kind === "EMAIL" ? opponentEmail.trim() : undefined,
      rackSize,
      modifiers: [...fields.modifiers],
      polyglotLanguages: [...fields.polyglotLanguages],
      wildLanguages: [...fields.wildLanguages],
    });
  }

  return (
    <form className={styles.screen} onSubmit={submit}>
      <div className={styles.header}>
        <h1>Ny match</h1>
        <button type="button" className={styles.button} onClick={onCancel}>
          Avbryt
        </button>
      </div>

      {opponent.kind === "EMAIL" ? (
        <label className={styles.field}>
          Motståndarens e-post
          <input
            className={styles.input}
            type="email"
            value={opponentEmail}
            onChange={(event) => setOpponentEmail(event.target.value)}
            required
          />
        </label>
      ) : (
        <p className={styles.opponent}>
          Mot <strong>{opponent.name}</strong>{" "}
          <span className={styles.handle}>@{opponent.handle}</span>
        </p>
      )}

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

      <ModifierPicker selection={selection} onChange={setSelection} />

      {(problem ?? error) && (
        <p className={styles.error} role="alert">
          {problem ?? error}
        </p>
      )}

      <button
        type="submit"
        className={`${styles.button} ${styles.primary}`}
        disabled={busy}
      >
        Bjud in
      </button>
    </form>
  );
}
