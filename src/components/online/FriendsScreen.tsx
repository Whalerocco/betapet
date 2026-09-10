"use client";

import { useState, type FormEvent } from "react";

import type { SocialGraph } from "../../application/online/friendsApi";

import styles from "./FriendsScreen.module.css";

export interface FriendsScreenProps {
  readonly graph: SocialGraph;
  readonly onSendRequest: (handle: string) => void;
  readonly onAccept: (requestId: string) => void;
  readonly onDecline: (requestId: string) => void;
  /** Invites a friend to a new match (T28.3). */
  readonly onStartMatch: (friendUserId: string) => void;
  readonly onBack: () => void;
  readonly busy?: boolean;
  readonly error?: string;
  /** What just happened, when it was not a failure — "förfrågan skickad". */
  readonly notice?: string;
}

/**
 * Friends, requests, and the way into a match with one (T28.1-T28.3).
 *
 * The screen opens with the user's own handle, because the first thing anybody needs from it is
 * the thing they read out to a friend. Requests to answer come next, since somebody is waiting;
 * the friend list, which is also the match-starting list, comes last.
 *
 * Like every other screen here, it holds only what is typed and reports upwards: no fetching, and
 * no opinion about what a handle is — the server decides that (DEC-027).
 */
export function FriendsScreen({
  graph,
  onSendRequest,
  onAccept,
  onDecline,
  onStartMatch,
  onBack,
  busy,
  error,
  notice,
}: FriendsScreenProps) {
  const [handle, setHandle] = useState("");

  function send(event: FormEvent) {
    event.preventDefault();
    onSendRequest(handle);
    setHandle("");
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1>Vänner</h1>
        <button type="button" className={styles.button} onClick={onBack}>
          Till matcher
        </button>
      </div>

      <p className={styles.ownHandle}>
        Din vänkod: <strong>@{graph.handle}</strong>
      </p>

      <form className={styles.panel} onSubmit={send}>
        <h2 className={styles.sectionTitle}>Lägg till vän</h2>
        <label className={styles.field}>
          Vänkod
          <input
            className={styles.input}
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            placeholder="@anna"
            required
          />
        </label>
        <button
          type="submit"
          className={`${styles.button} ${styles.primary}`}
          disabled={busy}
        >
          Skicka förfrågan
        </button>
      </form>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!error && notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}

      {graph.incoming.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Förfrågningar</h2>
          {graph.incoming.map((entry) => (
            <div key={entry.requestId} className={styles.row}>
              <span>
                <span className={styles.name}>{entry.name}</span>{" "}
                <span className={styles.handle}>@{entry.handle}</span>
              </span>
              <span className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.primary}`}
                  onClick={() => onAccept(entry.requestId)}
                  disabled={busy}
                >
                  Godkänn
                </button>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => onDecline(entry.requestId)}
                  disabled={busy}
                >
                  Neka
                </button>
              </span>
            </div>
          ))}
        </section>
      )}

      {graph.outgoing.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Väntar på svar</h2>
          {graph.outgoing.map((entry) => (
            <div key={entry.requestId} className={styles.row}>
              <span>
                <span className={styles.name}>{entry.name}</span>{" "}
                <span className={styles.handle}>@{entry.handle}</span>
              </span>
            </div>
          ))}
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Mina vänner</h2>
        {graph.friends.length === 0 ? (
          <p className={styles.empty}>
            Du har inga vänner än. Be om deras vänkod.
          </p>
        ) : (
          graph.friends.map((friend) => (
            <div key={friend.userId} className={styles.row}>
              <span>
                <span className={styles.name}>{friend.name}</span>{" "}
                <span className={styles.handle}>@{friend.handle}</span>
              </span>
              <button
                type="button"
                className={`${styles.button} ${styles.primary}`}
                onClick={() => onStartMatch(friend.userId)}
                disabled={busy}
              >
                Ny match
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
