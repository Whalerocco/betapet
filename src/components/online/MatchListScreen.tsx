"use client";

import type {
  MatchListCategory,
  MatchListEntry,
} from "../../application/online/matchApi";
import { describeMatchRules } from "../game/modifierCopy";

import styles from "./MatchListScreen.module.css";

/**
 * The sections of the match list, in the order they are shown (`tasks.md` T27.1).
 *
 * What needs the player's attention comes first: their turn, then a word waiting on their
 * verdict, then an invitation to answer. What is waiting on somebody else comes after, and what
 * is over comes last.
 */
const SECTIONS: readonly {
  category: MatchListCategory;
  title: string;
}[] = [
  { category: "YOUR_TURN", title: "Din tur" },
  { category: "AWAITING_YOUR_REVIEW", title: "Ord att granska" },
  { category: "INVITATION_RECEIVED", title: "Inbjudningar" },
  { category: "WAITING_FOR_OPPONENT", title: "Väntar på motståndaren" },
  { category: "INVITATION_SENT", title: "Skickade inbjudningar" },
  { category: "FINISHED", title: "Avslutade" },
  { category: "CANCELLED", title: "Avbrutna" },
];

export interface MatchListScreenProps {
  readonly playerName: string;
  readonly matches: readonly MatchListEntry[];
  readonly onOpen: (matchId: string) => void;
  readonly onAccept: (matchId: string) => void;
  readonly onDecline: (matchId: string) => void;
  /** Opens the setup screen, where the rules are chosen before inviting (T28.4). */
  readonly onNewMatch: () => void;
  /** Opens the friends screen, which is the other way to start a match (T28.3). */
  readonly onShowFriends: () => void;
  readonly onSignOut: () => void;
  readonly busy?: boolean;
  readonly error?: string;
}

export function MatchListScreen({
  playerName,
  matches,
  onOpen,
  onAccept,
  onDecline,
  onNewMatch,
  onShowFriends,
  onSignOut,
  busy,
  error,
}: MatchListScreenProps) {
  const sections = SECTIONS.map((section) => ({
    ...section,
    entries: matches.filter((match) => match.category === section.category),
  })).filter((section) => section.entries.length > 0);

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1>Mina matcher</h1>
        <span className={styles.headerActions}>
          <button
            type="button"
            className={styles.button}
            onClick={onShowFriends}
          >
            Vänner
          </button>
          <button type="button" className={styles.button} onClick={onSignOut}>
            Logga ut
          </button>
        </span>
      </div>
      <p className={styles.empty}>Inloggad som {playerName}</p>

      <button
        type="button"
        className={`${styles.button} ${styles.primary}`}
        onClick={onNewMatch}
        disabled={busy}
      >
        Ny match
      </button>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {sections.length === 0 && (
        <p className={styles.empty}>Du har inga matcher än.</p>
      )}

      {sections.map((section) => (
        <section key={section.category} className={styles.section}>
          <h2 className={styles.sectionTitle}>{section.title}</h2>
          {section.entries.map((match) =>
            match.category === "INVITATION_RECEIVED" ? (
              <div key={match.id} className={styles.match}>
                <span>
                  <span className={styles.opponent}>{match.opponentName}</span>
                  <span className={styles.rules}>
                    {describeMatchRules(match.configuration)}
                  </span>
                </span>
                <span className={styles.invitationActions}>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.primary}`}
                    onClick={() => onAccept(match.id)}
                    disabled={busy}
                  >
                    Acceptera
                  </button>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() => onDecline(match.id)}
                    disabled={busy}
                  >
                    Neka
                  </button>
                </span>
              </div>
            ) : (
              <button
                key={match.id}
                type="button"
                className={styles.match}
                onClick={() => onOpen(match.id)}
                /*
                 * An invitation nobody has answered has no game behind it, and a cancelled match
                 * never had one, so there is nothing to open.
                 */
                disabled={
                  match.category === "INVITATION_SENT" ||
                  match.category === "CANCELLED"
                }
              >
                <span>
                  <span className={styles.opponent}>{match.opponentName}</span>
                  <span className={styles.rules}>
                    {describeMatchRules(match.configuration)}
                  </span>
                </span>
              </button>
            ),
          )}
        </section>
      ))}
    </div>
  );
}
