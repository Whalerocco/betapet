import styles from "./StartScreen.module.css";

export interface StartScreenProps {
  readonly onStartNewGame: () => void;
  readonly onResumeGame?: () => void;
  readonly loadError?: boolean;
}

/**
 * The minimal entry screen (ui-design.md section 5, section 37). No accounts, profiles, or
 * online lobbies. "Fortsätt spel" only appears when a valid saved game was found.
 */
export function StartScreen({
  onStartNewGame,
  onResumeGame,
  loadError = false,
}: StartScreenProps) {
  return (
    <div className={styles.startScreen}>
      <h1>Betapet</h1>
      <button type="button" className={styles.primary} onClick={onStartNewGame}>
        Nytt spel
      </button>
      {onResumeGame && (
        <button type="button" onClick={onResumeGame}>
          Fortsätt spel
        </button>
      )}
      {loadError && (
        <p className={styles.notice}>
          Det gick inte att återställa det sparade spelet.
        </p>
      )}
    </div>
  );
}
