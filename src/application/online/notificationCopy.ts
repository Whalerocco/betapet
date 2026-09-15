import type { Notification } from "./notificationsApi";

/**
 * What a notification says, in Swedish (T30.1).
 *
 * The server sends a type and the facts behind it and nothing else, so this is the only place a
 * wording is decided — the same separation `failureMessages.ts` keeps for errors, and for the
 * same reason: a phrase should be changed in one file, and the server should not be that file.
 *
 * Every sentence names the other person, because that is what a player recognises a match by
 * (`online-multiplayer.md` sections 14 and 41, whose examples are all of the form "Anna …").
 */

/** A Swedish list: "KRAX", "KRAX och TN", "KRAX, TN och BLUNK". */
function joinWords(words: readonly string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} och ${words.at(-1)}`;
}

export function describeNotification(notification: Notification): string {
  const who = notification.otherUserName;
  const words = joinWords(notification.words);

  switch (notification.type) {
    case "YOUR_TURN":
      return `Din tur mot ${who}.`;

    case "MOVE_REJECTED":
      // The words are what makes this worth saying at all: without them it is only "your turn"
      // again, for a turn the player believed they had already taken.
      return words
        ? `${who} nekade ${notification.words.length === 1 ? "ditt ord" : "dina ord"} ${words}. Det är din tur igen.`
        : `${who} nekade din läggning. Det är din tur igen.`;

    case "AWAITING_YOUR_REVIEW":
      return words
        ? `${who} vill spela ${words}. Du behöver godkänna eller neka.`
        : `${who} vill spela ett ord som inte finns i ordlistan. Du behöver godkänna eller neka.`;

    case "MATCH_INVITATION":
      return `${who} har bjudit in dig till en match.`;

    case "MATCH_FINISHED":
      switch (notification.outcome) {
        case "WON":
          return `Matchen mot ${who} är slut. Du vann!`;
        case "LOST":
          return `Matchen mot ${who} är slut. ${who} vann.`;
        case "TIED":
          return `Matchen mot ${who} är slut. Det blev oavgjort.`;
        default:
          return `Matchen mot ${who} är slut.`;
      }

    case "FRIEND_REQUEST":
      return notification.otherUserHandle
        ? `${who} (@${notification.otherUserHandle}) vill bli vän.`
        : `${who} vill bli vän.`;
  }
}

/**
 * The count a badge carries, phrased for a screen reader.
 *
 * A bare number beside a heading reads as part of the heading, so the badge gets a name of its
 * own. Swedish plurals do not follow one rule, so both forms are given rather than derived —
 * "1 match" against "3 matcher", "1 vänförfrågan" against "3 vänförfrågningar".
 */
export function describeBadge(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
