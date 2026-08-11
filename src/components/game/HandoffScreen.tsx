import styles from "./HandoffScreen.module.css";

export interface HandoffScreenProps {
  readonly message: string;
  readonly continueLabel: string;
  readonly onContinue: () => void;
}

/**
 * A neutral privacy screen shown between viewers (local-multiplayer.md section 3, 8):
 * deliberately shows nothing about the game itself — no board, rack, or score — so a rack can
 * never leak through animation, layout glitches, or a mistimed click.
 */
export function HandoffScreen({
  message,
  continueLabel,
  onContinue,
}: HandoffScreenProps) {
  return (
    <div className={styles.handoff}>
      <p>{message}</p>
      <button type="button" className={styles.primary} onClick={onContinue}>
        {continueLabel}
      </button>
    </div>
  );
}
