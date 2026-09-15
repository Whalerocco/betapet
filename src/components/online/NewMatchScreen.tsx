"use client";

import { useState, type FormEvent } from "react";

import type { Friend } from "../../application/online/friendsApi";
import { ALL_TILES_BONUS_BY_RACK_SIZE } from "../../game/configuration/allTilesBonus";
import type { RackSize } from "../../game/model/gameConfiguration";
import {
  describeModifierProblem,
  EMPTY_MODIFIER_SELECTION,
  ModifierPicker,
  toConfigurationFields,
  type ModifierSelection,
} from "../game/ModifierPicker";

import {
  OpponentPicker,
  readTypedOpponent,
  type TypedOpponent,
} from "./OpponentPicker";

import styles from "./NewMatchScreen.module.css";

const RACK_SIZES: readonly RackSize[] = [6, 7, 8];

/**
 * Who the invitation is for.
 *
 * `CHOOSE` is the way in from the match list, where nobody has been picked yet and the screen
 * offers the opponent picker (T32.1). `FRIEND` is the way in from the friend list, where one is
 * already chosen and there is nothing to pick.
 */
export type NewMatchOpponent =
  | { readonly kind: "CHOOSE" }
  | {
      readonly kind: "FRIEND";
      readonly userId: string;
      readonly name: string;
      readonly handle: string;
    };

export interface NewMatchValues {
  /**
   * How the opponent was named, when the screen had to ask. Absent when a friend was chosen
   * before arriving, in which case the caller already holds their id.
   */
  readonly opponent?:
    TypedOpponent | { readonly kind: "FRIEND"; readonly userId: string };
  readonly rackSize: RackSize;
  readonly modifiers: readonly string[];
  readonly polyglotLanguages: readonly string[];
  readonly wildLanguages: readonly string[];
}

export interface NewMatchScreenProps {
  readonly opponent: NewMatchOpponent;
  /** The player's friends, offered as a list to pick from (T32.1). */
  readonly friends?: readonly Friend[];
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
  friends = [],
  onCreate,
  onCancel,
  busy,
  error,
}: NewMatchScreenProps) {
  const [opponentText, setOpponentText] = useState("");
  const [chosenFriend, setChosenFriend] = useState<Friend | undefined>();
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

    /*
     * A friend chosen from the list is named by id, which is what the server accepts from a
     * friend (T28.3); anything typed is read as a handle or an address and resolved server-side.
     */
    const named = chosenFriend
      ? ({ kind: "FRIEND", userId: chosenFriend.userId } as const)
      : readTypedOpponent(opponentText);

    if (opponent.kind === "CHOOSE" && !named) {
      setProblem("Välj en vän, eller skriv en vänkod eller e-postadress.");
      return;
    }
    setProblem(undefined);

    const fields = toConfigurationFields(selection);
    onCreate({
      opponent: opponent.kind === "CHOOSE" ? named : undefined,
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

      {opponent.kind === "CHOOSE" ? (
        <OpponentPicker
          friends={friends}
          value={opponentText}
          onChange={setOpponentText}
          selectedFriend={chosenFriend}
          onSelectFriend={setChosenFriend}
          disabled={busy}
        />
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
