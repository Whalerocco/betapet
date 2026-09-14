"use client";

import { request, type ApiResult } from "./matchApi";

/**
 * The interface's view of the notifications endpoint (T30.1).
 *
 * A notification arrives as a type and the facts behind it, never as a sentence: the server has
 * no business deciding Swedish wording, and `notificationCopy.ts` is the one place that does
 * (`architecture.md` section 25).
 */

export type NotificationType =
  | "YOUR_TURN"
  | "MOVE_REJECTED"
  | "AWAITING_YOUR_REVIEW"
  | "MATCH_INVITATION"
  | "MATCH_FINISHED"
  | "FRIEND_REQUEST";

export interface Notification {
  readonly id: string;
  readonly type: NotificationType;
  readonly otherUserName: string;
  readonly otherUserHandle?: string;
  /** Present for every match notification; absent for a friend request. */
  readonly matchId?: string;
  /** Present only for a friend request, which is answered by naming the row. */
  readonly requestId?: string;
  /** The words proposed for review, or the ones that were rejected. */
  readonly words: readonly string[];
  readonly outcome?: "WON" | "LOST" | "TIED";
  /** An ISO string on the wire. */
  readonly occurredAt: string;
}

/** How many of each kind, so a badge and the screen behind it cannot disagree. */
export type NotificationCounts = Readonly<Record<NotificationType, number>>;

export interface NotificationFeed {
  readonly notifications: readonly Notification[];
  readonly counts: NotificationCounts;
}

export function fetchNotifications(): Promise<ApiResult<NotificationFeed>> {
  return request("/api/notifications");
}

/**
 * Records that the user has looked at a match.
 *
 * Only a finished match needs this — everything else stops being a notification the moment the
 * player acts — but it is sent whenever a match is opened, because "I have seen this" is true
 * then regardless of what the match turns out to be waiting for.
 */
export function markMatchSeen(
  matchId: string,
): Promise<ApiResult<{ seen: boolean }>> {
  return request(`/api/matches/${matchId}/seen`, { method: "POST" });
}

/** Nothing is waiting, as an empty feed rather than as `undefined`. */
export const NO_NOTIFICATIONS: NotificationFeed = {
  notifications: [],
  counts: {
    YOUR_TURN: 0,
    MOVE_REJECTED: 0,
    AWAITING_YOUR_REVIEW: 0,
    MATCH_INVITATION: 0,
    MATCH_FINISHED: 0,
    FRIEND_REQUEST: 0,
  },
};

/**
 * How many things the user is actually being asked to do.
 *
 * A finished match is deliberately not counted: it is worth telling somebody about once, but it
 * asks nothing of them, and a badge that never clears until they open the match would say the
 * same thing as one that does — while being wrong about what it means.
 */
export function actionableCount(counts: NotificationCounts): number {
  return (
    counts.YOUR_TURN +
    counts.MOVE_REJECTED +
    counts.AWAITING_YOUR_REVIEW +
    counts.MATCH_INVITATION +
    counts.FRIEND_REQUEST
  );
}
