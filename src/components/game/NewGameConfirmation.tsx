import styles from "./NewGameConfirmation.module.css";

export interface NewGameConfirmationProps {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

/** Guards against accidentally losing an unfinished game (ui-design.md section 36). */
export function NewGameConfirmation({
  onCancel,
  onConfirm,
}: NewGameConfirmationProps) {
  return (
    <div className={styles.confirmation}>
      <p>Det finns redan ett pågående spel.</p>
      <p>Vill du avsluta det och starta ett nytt?</p>
      <div className={styles.buttonRow}>
        <button type="button" onClick={onCancel}>
          Avbryt
        </button>
        <button type="button" className={styles.primary} onClick={onConfirm}>
          Starta nytt
        </button>
      </div>
    </div>
  );
}
