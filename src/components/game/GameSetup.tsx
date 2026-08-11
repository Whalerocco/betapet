"use client";

import { useState, type FormEvent } from "react";
import { ALL_TILES_BONUS_BY_RACK_SIZE } from "../../game/configuration/allTilesBonus";
import type { RackSize } from "../../game/model/gameConfiguration";
import styles from "./GameSetup.module.css";

export interface GameSetupValues {
  readonly playerOneName: string;
  readonly playerTwoName: string;
  readonly rackSize: RackSize;
}

export interface GameSetupProps {
  readonly onStartGame: (values: GameSetupValues) => void;
}

const RACK_SIZES: readonly RackSize[] = [6, 7, 8];

/** Collects only what the game rules require to start (ui-design.md section 6). */
export function GameSetup({ onStartGame }: GameSetupProps) {
  const [playerOneName, setPlayerOneName] = useState("");
  const [playerTwoName, setPlayerTwoName] = useState("");
  const [rackSize, setRackSize] = useState<RackSize>(7);
  const [error, setError] = useState<string | undefined>(undefined);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedOne = playerOneName.trim();
    const trimmedTwo = playerTwoName.trim();
    if (trimmedOne.length === 0 || trimmedTwo.length === 0) {
      setError("Ange namn för båda spelarna.");
      return;
    }
    setError(undefined);
    onStartGame({
      playerOneName: trimmedOne,
      playerTwoName: trimmedTwo,
      rackSize,
    });
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

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <button type="submit" className={styles.primary}>
        Starta spel
      </button>
    </form>
  );
}
