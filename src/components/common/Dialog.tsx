"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import styles from "./Dialog.module.css";

export interface DialogProps {
  /** Accessible name (ui-design.md section 43: "Dialogs have proper accessible titles"). */
  readonly titleText: string;
  /** Called when the user dismisses the dialog via Escape, if dismissal is allowed here. */
  readonly onClose?: () => void;
  /**
   * A ref to the element to return focus to when this dialog closes. Only needed when opening
   * the dialog also unmounts the trigger (e.g. it lived in a footer that's conditionally
   * rendered based on the same state the dialog opens on) — in that case the trigger is already
   * gone, and focus has already fallen back to <body>, by the time this component's own mount
   * effect would otherwise capture `document.activeElement`. Capture it into a ref in the click
   * handler instead (before the state update that unmounts it) and pass that ref here — reading
   * `.current` has to happen inside this component's own effect, not the caller's render, since
   * reading a ref during render is not allowed. Omit when the trigger stays mounted alongside
   * the dialog (self-capture in the mount effect is correct in that case).
   */
  readonly restoreFocusTo?: RefObject<Element | null>;
  readonly children: ReactNode;
}

/**
 * Wraps the interrupting decisions ui-design.md section 54 lists as dialogs (unknown-word
 * confirmation, pass confirmation, new-game overwrite, blank letter choice) in a native
 * `<dialog>`. `showModal()` gives focus containment, Escape-to-cancel, and a backdrop for free
 * in every real browser. It doesn't exist in the jsdom test environment (jsdom has no
 * `HTMLDialogElement.showModal`), so every call is optional-chained rather than assumed; tests
 * still see the dialog's children mounted in the DOM regardless.
 *
 * The caller controls visibility by conditionally rendering `<Dialog>` at all, matching the
 * existing inline-conditional pattern elsewhere in this codebase.
 */
export function Dialog({
  titleText,
  onClose,
  restoreFocusTo,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Must be captured before showModal(), which immediately moves focus into the dialog itself.
    // Native close() only restores focus to the trigger if the dialog is still attached to the
    // document when it runs. React removes an unmounting component's DOM node before passive
    // effect cleanups fire, so by the time this cleanup runs the dialog is already detached and
    // native restoration silently does nothing (focus falls back to <body> instead). Capturing
    // and restoring it ourselves works regardless of that ordering — unless the trigger was
    // already gone by the time this effect runs (see restoreFocusTo's doc), in which case the
    // caller-supplied ref is used instead of this (already-useless) self-capture.
    const previouslyFocused = restoreFocusTo?.current ?? document.activeElement;
    // jsdom (used by the component test suite) has no HTMLDialogElement.showModal, so it never
    // gets the `open` attribute a real showModal() call sets as a side effect; without it, an
    // accessibility tree correctly treats a <dialog> as hidden. Set `open` directly as a
    // fallback so tests see the same accessible content a real open dialog would expose, even
    // without native focus-trap/backdrop behaviour the test suite doesn't exercise anyway.
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    return () => {
      if (typeof dialog.close === "function" && dialog.open) {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    };
    // restoreFocusTo is a ref; its identity is expected to stay stable, and this must only run
    // once per dialog open/close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    function handleCancel(event: Event) {
      if (!onClose) {
        event.preventDefault();
        return;
      }
      onClose();
    }
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  return (
    <dialog ref={ref} className={styles.dialog} aria-label={titleText}>
      {children}
    </dialog>
  );
}
