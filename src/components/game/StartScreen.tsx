import Link from "next/link";

import styles from "./StartScreen.module.css";

export interface StartScreenProps {
  readonly onStartNewGame: () => void;
  readonly onResumeGame?: () => void;
  readonly loadError?: boolean;
}

/**
 * The entry screen (ui-design.md section 5, section 37). "Fortsätt spel" only appears when a
 * valid saved game was found.
 *
 * The online link is the one addition to what section 37 describes, and it is deliberately just a
 * link: hot-seat play needs no account and asks for nothing, and reaching the online game is a
 * choice rather than a step on the way in.
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
      <Link className={styles.link} href="/online">
        Spela online
      </Link>
      {loadError && (
        <p className={styles.notice}>
          Det gick inte att återställa det sparade spelet.
        </p>
      )}
    </div>
  );
}
