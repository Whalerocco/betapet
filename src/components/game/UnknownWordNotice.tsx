import styles from "./UnknownWordNotice.module.css";

export interface UnknownWordNoticeProps {
  readonly words: readonly string[];
  readonly scorePreview: number;
  readonly onEdit: () => void;
  readonly onConfirm: () => void;
}

/**
 * Shown to the proposing player right after Spela finds one or more unknown words
 * (ui-design.md section 21): the whole move is one unit, so every unknown word is listed
 * together rather than approved individually (game-rules.md section 19-ish "whole move").
 */
export function UnknownWordNotice({
  words,
  scorePreview,
  onEdit,
  onConfirm,
}: UnknownWordNoticeProps) {
  const wordList = words.map((word) => `"${word}"`).join(", ");

  return (
    <div className={styles.notice}>
      <p>{wordList} finns inte i ordlistan.</p>
      <p>{scorePreview} poäng om läggningen godkänns.</p>
      <p>Vill du spela läggningen ändå?</p>
      <div className={styles.buttonRow}>
        <button type="button" onClick={onEdit}>
          Ändra
        </button>
        <button type="button" className={styles.primary} onClick={onConfirm}>
          Spela ändå
        </button>
      </div>
    </div>
  );
}
