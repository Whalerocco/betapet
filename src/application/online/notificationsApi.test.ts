import { describe, expect, it } from "vitest";

import {
  formatBadgeCount,
  matchesWaitingCount,
  notificationForMatch,
  type Notification,
} from "./notificationsApi";

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n-1",
    type: "YOUR_TURN",
    otherUserName: "Anna",
    matchId: "m-1",
    words: [],
    occurredAt: "2026-09-15T10:00:00.000Z",
    ...overrides,
  };
}

describe("matchesWaitingCount", () => {
  /*
   * What the in-match "Mina matcher" button is badged with. The button leads away from the match
   * on screen, so counting that match would be a lie about what is behind it.
   */
  it("leaves out the match the player is looking at", () => {
    const feed = [
      notification({ id: "a", matchId: "m-1" }),
      notification({ id: "b", matchId: "m-2" }),
      notification({ id: "c", matchId: "m-3" }),
    ];

    expect(matchesWaitingCount(feed)).toBe(3);
    expect(matchesWaitingCount(feed, "m-1")).toBe(2);
  });

  it("counts a rejected move, which is still a move that is owed", () => {
    expect(
      matchesWaitingCount([
        notification({ id: "a", type: "MOVE_REJECTED", matchId: "m-2" }),
      ]),
    ).toBe(1);
  });

  /* A finished match asks nothing of anybody, so it is news rather than a task. */
  it("does not count a finished match", () => {
    expect(
      matchesWaitingCount([
        notification({ id: "a", type: "MATCH_FINISHED", matchId: "m-2" }),
      ]),
    ).toBe(0);
  });

  /* Friend requests have their own badge on the friends button and are not matches. */
  it("does not count a friend request", () => {
    expect(
      matchesWaitingCount([
        notification({
          id: "a",
          type: "FRIEND_REQUEST",
          matchId: undefined,
          requestId: "r-1",
        }),
      ]),
    ).toBe(0);
  });

  it("counts an invitation and a word awaiting review", () => {
    expect(
      matchesWaitingCount([
        notification({ id: "a", type: "MATCH_INVITATION", matchId: "m-2" }),
        notification({ id: "b", type: "AWAITING_YOUR_REVIEW", matchId: "m-3" }),
      ]),
    ).toBe(2);
  });
});

describe("formatBadgeCount", () => {
  it("shows the number up to 99", () => {
    expect(formatBadgeCount(1)).toBe("1");
    expect(formatBadgeCount(99)).toBe("99");
  });

  /* Past 99 the exact figure stops being information, and a wider badge distorts its control. */
  it("caps at 99+", () => {
    expect(formatBadgeCount(100)).toBe("99+");
    expect(formatBadgeCount(5000)).toBe("99+");
  });
});

describe("notificationForMatch", () => {
  it("finds the one notification about a match, and nothing for a match without one", () => {
    const feed = [
      notification({ id: "a", matchId: "m-1" }),
      notification({ id: "b", matchId: "m-2" }),
    ];

    expect(notificationForMatch(feed, "m-2")?.id).toBe("b");
    expect(notificationForMatch(feed, "m-9")).toBeUndefined();
  });
});
