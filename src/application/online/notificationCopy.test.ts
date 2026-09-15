import { describe, expect, it } from "vitest";

import { describeBadge, describeNotification } from "./notificationCopy";
import type { Notification } from "./notificationsApi";

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n-1",
    type: "YOUR_TURN",
    otherUserName: "Anna",
    matchId: "match-1",
    words: [],
    occurredAt: "2026-09-14T10:00:00.000Z",
    ...overrides,
  };
}

describe("describeNotification", () => {
  it("names the opponent, because that is what a match is recognised by", () => {
    expect(describeNotification(notification())).toBe("Din tur mot Anna.");
  });

  /*
   * The whole reason a rejection is its own type: as a bare "din tur" it would be a turn the
   * player believed they had already taken, with no hint of what happened to it.
   */
  it("says what was rejected, and that the turn is back", () => {
    expect(
      describeNotification(
        notification({ type: "MOVE_REJECTED", words: ["BLUNK"] }),
      ),
    ).toBe("Anna nekade ditt ord BLUNK. Det är din tur igen.");
  });

  it("puts a rejected move in the plural when several words were formed", () => {
    expect(
      describeNotification(
        notification({ type: "MOVE_REJECTED", words: ["BLUNK", "TN"] }),
      ),
    ).toBe("Anna nekade dina ord BLUNK och TN. Det är din tur igen.");
  });

  /*
   * A rejection with no words is possible — the payload carries whatever the engine found
   * unknown — and the sentence has to stay Swedish rather than trailing off into an empty slot.
   */
  it("still reads as a sentence when a rejection names no words", () => {
    expect(
      describeNotification(notification({ type: "MOVE_REJECTED", words: [] })),
    ).toBe("Anna nekade din läggning. Det är din tur igen.");
  });

  it("quotes the word awaiting a verdict", () => {
    expect(
      describeNotification(
        notification({ type: "AWAITING_YOUR_REVIEW", words: ["KRAX"] }),
      ),
    ).toBe("Anna vill spela KRAX. Du behöver godkänna eller neka.");
  });

  it("joins three words the Swedish way", () => {
    expect(
      describeNotification(
        notification({
          type: "AWAITING_YOUR_REVIEW",
          words: ["KRAX", "TN", "BLUNK"],
        }),
      ),
    ).toContain("KRAX, TN och BLUNK");
  });

  it("describes an invitation", () => {
    expect(
      describeNotification(notification({ type: "MATCH_INVITATION" })),
    ).toBe("Anna har bjudit in dig till en match.");
  });

  it("tells each side of a finished match what happened to them", () => {
    expect(
      describeNotification(
        notification({ type: "MATCH_FINISHED", outcome: "WON" }),
      ),
    ).toBe("Matchen mot Anna är slut. Du vann!");
    expect(
      describeNotification(
        notification({ type: "MATCH_FINISHED", outcome: "LOST" }),
      ),
    ).toBe("Matchen mot Anna är slut. Anna vann.");
    expect(
      describeNotification(
        notification({ type: "MATCH_FINISHED", outcome: "TIED" }),
      ),
    ).toBe("Matchen mot Anna är slut. Det blev oavgjort.");
  });

  /*
   * The result is missing when the stored state could not be read back. The notification is still
   * worth giving — the match is over either way — so it must not claim a result it does not have.
   */
  it("claims no result when the match's outcome is unknown", () => {
    expect(describeNotification(notification({ type: "MATCH_FINISHED" }))).toBe(
      "Matchen mot Anna är slut.",
    );
  });

  it("gives a friend request the handle, which is what is read back to somebody", () => {
    expect(
      describeNotification(
        notification({
          type: "FRIEND_REQUEST",
          otherUserHandle: "anna",
          matchId: undefined,
          requestId: "request-1",
        }),
      ),
    ).toBe("Anna (@anna) vill bli vän.");
  });
});

describe("describeBadge", () => {
  it("uses the singular for one and the plural for the rest", () => {
    expect(describeBadge(1, "vänförfrågan", "vänförfrågningar")).toBe(
      "1 vänförfrågan",
    );
    expect(describeBadge(3, "vänförfrågan", "vänförfrågningar")).toBe(
      "3 vänförfrågningar",
    );
  });
});
