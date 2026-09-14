"use client";

import type {
  MatchListCategory,
  MatchListEntry,
} from "../../application/online/matchApi";
import { describeBadge } from "../../application/online/notificationCopy";
import {
  actionableCount,
  NO_NOTIFICATIONS,
  type NotificationCounts,
} from "../../application/online/notificationsApi";
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
  /**
   * How many of this section's matches are unattended, given the notification counts.
   *
   * The badge is taken from the notification feed rather than from the number of rows, because
   * the two are not the same question: every match in `Avslutade` is finished, but only the ones
   * the player has not looked at are news (T30.1). Sections nobody is waiting on carry no badge.
   */
  badge?: (counts: NotificationCounts) => number;
  /** The badge's accessible name, since a bare number beside a heading reads as part of it. */
  badgeLabel?: readonly [singular: string, plural: string];
}[] = [
  {
    category: "YOUR_TURN",
    title: "Din tur",
    // A rejected move is still a move that is owed, and it is filed here.
    badge: (counts) => counts.YOUR_TURN + counts.MOVE_REJECTED,
    badgeLabel: ["match väntar på dig", "matcher väntar på dig"],
  },
  {
    category: "AWAITING_YOUR_REVIEW",
    title: "Ord att granska",
    badge: (counts) => counts.AWAITING_YOUR_REVIEW,
    badgeLabel: ["ord att granska", "ord att granska"],
  },
  {
    category: "INVITATION_RECEIVED",
    title: "Inbjudningar",
    badge: (counts) => counts.MATCH_INVITATION,
    badgeLabel: ["obesvarad inbjudan", "obesvarade inbjudningar"],
  },
  { category: "WAITING_FOR_OPPONENT", title: "Väntar på motståndaren" },
  { category: "INVITATION_SENT", title: "Skickade inbjudningar" },
  {
    category: "FINISHED",
    title: "Avslutade",
    badge: (counts) => counts.MATCH_FINISHED,
    badgeLabel: ["nytt resultat", "nya resultat"],
  },
  { category: "CANCELLED", title: "Avbrutna" },
];

/**
 * A count, together with the words that say what it counts (T30.1).
 *
 * The number is what is drawn; the phrase is present but not shown. It is not an `aria-label` on
 * the span, because a bare `<span>` carries no role and a label on one is not reliably announced.
 * Hidden text is, and it joins the accessible name of the heading or button the badge sits in —
 * so "Vänner" becomes "Vänner 2 vänförfrågningar" rather than "Vänner 2".
 */
function Badge({
  count,
  singular,
  plural,
}: {
  readonly count: number;
  readonly singular: string;
  readonly plural: string;
}) {
  if (count <= 0) return null;

  return (
    <>
      <span className={styles.badge} aria-hidden="true">
        {count}
      </span>
      <span className={styles.badgeLabel}>
        {describeBadge(count, singular, plural)}
      </span>
    </>
  );
}

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
  /** Opens the notifications screen (T30.1). */
  readonly onShowNotifications: () => void;
  /**
   * What is waiting on this player, which the badges are drawn from (T30.1). Absent until the
   * feed has been fetched, and then nothing is badged rather than everything.
   */
  readonly counts?: NotificationCounts;
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
  onShowNotifications,
  counts = NO_NOTIFICATIONS.counts,
  onSignOut,
  busy,
  error,
}: MatchListScreenProps) {
  const sections = SECTIONS.map((section) => ({
    ...section,
    entries: matches.filter((match) => match.category === section.category),
  })).filter((section) => section.entries.length > 0);

  const waiting = actionableCount(counts);

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1>Mina matcher</h1>
        <span className={styles.headerActions}>
          <button
            type="button"
            className={styles.button}
            onClick={onShowNotifications}
          >
            Notiser
            <Badge count={waiting} singular="ny notis" plural="nya notiser" />
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={onShowFriends}
          >
            Vänner
            <Badge
              count={counts.FRIEND_REQUEST}
              singular="vänförfrågan"
              plural="vänförfrågningar"
            />
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

      {sections.map((section) => {
        const badge = section.badge?.(counts) ?? 0;

        return (
          <section key={section.category} className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {section.title}
              {section.badgeLabel && (
                <Badge
                  count={badge}
                  singular={section.badgeLabel[0]}
                  plural={section.badgeLabel[1]}
                />
              )}
            </h2>
            {section.entries.map((match) =>
              match.category === "INVITATION_RECEIVED" ? (
                <div key={match.id} className={styles.match}>
                  <span>
                    <span className={styles.opponent}>
                      {match.opponentName}
                    </span>
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
                    <span className={styles.opponent}>
                      {match.opponentName}
                    </span>
                    <span className={styles.rules}>
                      {describeMatchRules(match.configuration)}
                    </span>
                  </span>
                </button>
              ),
            )}
          </section>
        );
      })}
    </div>
  );
}
