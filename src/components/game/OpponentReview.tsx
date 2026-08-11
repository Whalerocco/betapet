import styles from "./OpponentReview.module.css";

export interface OpponentReviewProps {
  readonly proposingPlayerName: string;
  readonly words: readonly string[];
  readonly scorePreview: number;
  readonly onAccept: () => void;
  readonly onReject: () => void;
}

/**
 * The opponent-review screen (ui-design.md sections 26-27): a distinct response state, not the
 * reviewer's normal turn. The decision applies to the whole move, never individual words
 * (local-multiplayer.md section 18), and needs neither player's rack.
 */
export function OpponentReview({
  proposingPlayerName,
  words,
  scorePreview,
  onAccept,
  onReject,
}: OpponentReviewProps) {
  const wordList = words.map((word) => `"${word}"`).join(", ");

  return (
    <div className={styles.review}>
      <p>
        {proposingPlayerName} vill spela {wordList}, som inte finns i ordlistan.
      </p>
      <p>{scorePreview} poäng om läggningen godkänns.</p>
      <div className={styles.buttonRow}>
        <button type="button" onClick={onReject}>
          Neka
        </button>
        <button type="button" className={styles.primary} onClick={onAccept}>
          Godkänn
        </button>
      </div>
    </div>
  );
}
