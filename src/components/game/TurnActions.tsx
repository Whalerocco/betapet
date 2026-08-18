"use client";

import { useRef, useState } from "react";
import { Dialog } from "../common/Dialog";
import styles from "./TurnActions.module.css";

export interface TurnActionsProps {
  readonly canSubmit: boolean;
  readonly canPass: boolean;
  readonly canClear: boolean;
  readonly exchangeMode: boolean;
  readonly exchangeSelectionCount: number;
  readonly canStartExchange: boolean;
  readonly onSubmit: () => void;
  readonly onClear: () => void;
  readonly onStartExchange: () => void;
  readonly onCancelExchange: () => void;
  readonly onConfirmExchange: () => void;
  readonly onPass: () => void;
}

/**
 * The three primary turn actions plus the secondary "Rensa" action (ui-design.md section 18)
 * that returns every pending tile to the rack in one step. Pass and exchange end the turn, so
 * both get a lightweight confirmation step (ui-design.md sections 34-35) before dispatching.
 */
export function TurnActions({
  canSubmit,
  canPass,
  canClear,
  exchangeMode,
  exchangeSelectionCount,
  canStartExchange,
  onSubmit,
  onClear,
  onStartExchange,
  onCancelExchange,
  onConfirmExchange,
  onPass,
}: TurnActionsProps) {
  const [confirmingPass, setConfirmingPass] = useState(false);
  /**
   * Restoring focus on close only works if the "Passa" button is still an attached DOM node at
   * that point — a detached element can't be focused. That's why the button row below is always
   * rendered, with the dialog layered alongside it, rather than the dialog replacing it: this
   * ref is captured synchronously in the click handler purely so restoreFocusTo has the exact
   * element (matches Dialog.tsx's restoreFocusTo doc), not because the button ever unmounts.
   */
  const passTriggerRef = useRef<Element | null>(null);

  // Selecting tiles to exchange requires the Rack to stay visible and interactive, so this
  // stays inline rather than becoming a modal dialog (unlike the other flows ui-design.md
  // section 54 lists) — only "confirmingPass" below has no reason to keep anything else live.
  if (exchangeMode) {
    return (
      <div className={styles.actions}>
        <p>Välj brickor att byta. Att byta brickor avslutar din tur.</p>
        <div className={styles.buttonRow}>
          <button type="button" onClick={onCancelExchange}>
            Avbryt
          </button>
          <button
            type="button"
            className={styles.primary}
            onClick={onConfirmExchange}
            disabled={exchangeSelectionCount === 0}
          >
            Byt {exchangeSelectionCount}{" "}
            {exchangeSelectionCount === 1 ? "bricka" : "brickor"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.buttonRow}>
        <button
          type="button"
          className={styles.primary}
          onClick={onSubmit}
          disabled={!canSubmit}
        >
          Spela
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={!canClear}
          title="Rensa alla brickor från spelplanen tillbaka till din hand"
        >
          Rensa
        </button>
        <button
          type="button"
          onClick={onStartExchange}
          disabled={!canStartExchange}
        >
          Byt brickor
        </button>
        <button
          type="button"
          onClick={(event) => {
            passTriggerRef.current = event.currentTarget;
            setConfirmingPass(true);
          }}
          disabled={!canPass}
        >
          Passa
        </button>
      </div>

      {confirmingPass && (
        <Dialog
          titleText="Bekräfta passning"
          onClose={() => setConfirmingPass(false)}
          restoreFocusTo={passTriggerRef}
        >
          <div className={styles.actions}>
            <p>
              Vill du passa? Din tur avslutas utan att du spelar några
              brickor.
            </p>
            <div className={styles.buttonRow}>
              <button type="button" onClick={() => setConfirmingPass(false)}>
                Avbryt
              </button>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  setConfirmingPass(false);
                  onPass();
                }}
              >
                Passa
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
