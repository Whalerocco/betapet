import styles from "./StartScreen.module.css";

export interface StartScreenProps {
  readonly onStartNewGame: () => void;
}

/** The minimal entry screen (ui-design.md section 5). No accounts, profiles, or online lobbies. */
export function StartScreen({ onStartNewGame }: StartScreenProps) {
  return (
    <div className={styles.startScreen}>
      <h1>Betapet</h1>
      <button type="button" className={styles.primary} onClick={onStartNewGame}>
        Nytt spel
      </button>
    </div>
  );
}
