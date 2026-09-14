"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import type { ChatMessage } from "../../application/online/chatApi";

import styles from "./MatchChat.module.css";

export interface MatchChatProps {
  readonly messages: readonly ChatMessage[];
  /** Which messages are this player's own, so the two sides can be told apart. */
  readonly viewerUserId: string;
  readonly maxLength: number;
  readonly onSend: (text: string) => void;
  readonly busy?: boolean;
}

/**
 * The conversation within a match (T29.1; `online-multiplayer.md` sections 39-40).
 *
 * Text only, chronological, and nothing else: no uploads, no reactions, no editing. Section 40
 * lists exactly that, and each of them is a decision this component does not get to revisit.
 *
 * **How user text is rendered safely.** The message is placed as a JSX child, so React escapes it
 * — there is no `dangerouslySetInnerHTML` here and there must never be one. Two stylesheet rules
 * do the rest of the work that escaping does not: `white-space: pre-wrap` keeps the line breaks
 * somebody typed without any markup being introduced to represent them, and `overflow-wrap`
 * breaks a 500-character word instead of letting it push the board sideways. Nothing in the text
 * is turned into a link; a URL is shown as the characters it is made of.
 *
 * Like the other online screens it holds only what is being typed, and reports upwards.
 */
export function MatchChat({
  messages,
  viewerUserId,
  maxLength,
  onSend,
  busy,
}: MatchChatProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLOListElement>(null);

  /*
   * A conversation is read at its newest end, so the list is kept scrolled there — including when
   * a poll brings somebody else's message in while the panel is open.
   */
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    onSend(text);
    setDraft("");
  }

  return (
    <section className={styles.chat} aria-label="Chatt">
      <h2 className={styles.title}>Chatt</h2>

      {messages.length === 0 ? (
        <p className={styles.empty}>Inga meddelanden än.</p>
      ) : (
        <ol className={styles.messages} ref={listRef}>
          {messages.map((message) => (
            <li
              key={message.id}
              className={`${styles.message} ${
                message.senderUserId === viewerUserId ? styles.own : ""
              }`}
            >
              <span className={styles.sender}>{message.senderName}</span>
              <span className={styles.text}>{message.text}</span>
            </li>
          ))}
        </ol>
      )}

      <form className={styles.form} onSubmit={submit}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Skriv ett meddelande</span>
          <input
            className={styles.input}
            value={draft}
            maxLength={maxLength}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Skriv ett meddelande"
          />
        </label>
        <button
          type="submit"
          className={styles.button}
          disabled={busy || draft.trim().length === 0}
        >
          Skicka
        </button>
      </form>
    </section>
  );
}
