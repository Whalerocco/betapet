"use client";

import styles from "./ShuffleButton.module.css";

/**
 * Rearranges the tiles in your own hand, which is how you find a word you cannot see.
 *
 * An icon rather than the words "Blanda brickor": beside the rack the label was wider than several
 * tiles, and that space is what the tiles themselves need on a phone. The Swedish accessible name
 * stays, so nothing is lost to a screen reader.
 *
 * Shared by the hot-seat and online screens, which shuffle differently underneath — the hot-seat
 * game holds a `GameState` and goes through the engine, the online client holds a view and
 * arranges its own tiles (DEC-026) — but which offer the player the same button in the same place.
 */
export interface ShuffleButtonProps {
  readonly onClick: () => void;
  readonly disabled?: boolean;
}

function ShuffleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.35em"
      height="1.35em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M16 3h5v5" />
      <path d="M4 20 21 3" />
      <path d="M21 16v5h-5" />
      <path d="m15 15 6 6" />
      <path d="m4 4 5 5" />
    </svg>
  );
}

export function ShuffleButton({ onClick, disabled }: ShuffleButtonProps) {
  return (
    <button
      type="button"
      className={styles.shuffleButton}
      onClick={onClick}
      disabled={disabled}
      aria-label="Blanda brickorna i din hand"
      title="Blanda brickorna i din hand"
    >
      <ShuffleIcon />
    </button>
  );
}
