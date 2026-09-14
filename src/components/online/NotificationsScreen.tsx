"use client";

import {
  describeNotification,
  describeNotificationAction,
} from "../../application/online/notificationCopy";
import type { Notification } from "../../application/online/notificationsApi";

import styles from "./NotificationsScreen.module.css";

export interface NotificationsScreenProps {
  readonly notifications: readonly Notification[];
  /** Opens the match the notification is about. */
  readonly onOpenMatch: (matchId: string) => void;
  /** Goes to the friends screen, where a request is answered (T28.2). */
  readonly onShowFriends: () => void;
  readonly onBack: () => void;
  readonly busy?: boolean;
  readonly error?: string;
}

/**
 * Everything waiting on this player, in one place (T30.1; `online-multiplayer.md` section 41).
 *
 * The match list already sorts matches into piles, and for four of the six notifications that is
 * most of the story. This screen exists for the other two: a rejected move and a finished game
 * have no section of their own — a rejection is an ordinary `Din tur` row that does not say why
 * the turn came back, and a finished match sits in `Avslutade` looking exactly like every match
 * that finished weeks ago. Both are events, and an event needs a sentence.
 *
 * Like every other screen here it holds nothing and fetches nothing: it renders what it is given
 * and reports upwards.
 */
export function NotificationsScreen({
  notifications,
  onOpenMatch,
  onShowFriends,
  onBack,
  busy,
  error,
}: NotificationsScreenProps) {
  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1>Notiser</h1>
        <button type="button" className={styles.button} onClick={onBack}>
          Till matcher
        </button>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {notifications.length === 0 ? (
        <p className={styles.empty}>Inget väntar på dig just nu.</p>
      ) : (
        <ul className={styles.list}>
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`${styles.row} ${styles[notification.type] ?? ""}`}
            >
              <span className={styles.text}>
                {describeNotification(notification)}
              </span>
              <button
                type="button"
                className={`${styles.button} ${styles.primary}`}
                disabled={busy}
                onClick={() => {
                  if (notification.type === "FRIEND_REQUEST") onShowFriends();
                  else if (notification.matchId)
                    onOpenMatch(notification.matchId);
                }}
              >
                {describeNotificationAction(notification)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
