import { describeGameError } from "../game-controller/errorMessages";
import type { GameErrorCode } from "../../game/model/gameError";

import type { ApiFailure } from "./matchApi";

/**
 * Swedish text for the ways a request can fail (`architecture.md` section 25: only this layer
 * knows the wording).
 *
 * A rejected rule is deferred to `describeGameError`, so an online player and a hot-seat player
 * are told the same thing in the same words when the engine refuses the same move.
 */
export function describeFailure(failure: ApiFailure): string {
  switch (failure.error) {
    case "UNAUTHENTICATED":
      return "Du är utloggad. Logga in igen.";
    case "NOT_FOUND":
      return "Matchen finns inte, eller så är den inte din.";
    case "OPPONENT_NOT_FOUND":
      return "Ingen spelare med den e-postadressen.";
    case "CANNOT_PLAY_ALONE":
      return "Du kan inte spela mot dig själv.";
    case "INVALID_CONFIGURATION":
      // The screen checks the same rules before sending, so reaching this means the two
      // disagreed — the engine's answer is the one that counts.
      return "Spellägena kan inte kombineras. Välj andra lägen.";
    case "USER_NOT_FOUND":
      return "Ingen spelare med den vänkoden.";
    case "CANNOT_FRIEND_SELF":
      return "Det är din egen vänkod.";
    case "ALREADY_FRIENDS":
      return "Ni är redan vänner.";
    case "ALREADY_REQUESTED":
      return "Förfrågan är redan skickad. Väntar på svar.";
    case "WRONG_MATCH_STATUS":
      return "Matchen är inte i det läget längre.";
    case "STALE_REVISION":
      // Not the player's mistake: the opponent got there first, so the board they acted on is
      // out of date (`online-multiplayer.md` section 31).
      return "Motståndaren hann före. Matchen har uppdaterats.";
    case "RULE_REJECTED":
      return failure.code
        ? describeGameError({
            code: failure.code as GameErrorCode,
            messageKey: failure.messageKey ?? "",
          })
        : "Läggningen kunde inte göras.";
    case "NETWORK":
      return "Ingen kontakt med servern. Försök igen.";
    case "UNKNOWN":
      return "Något gick fel.";
  }
}

/**
 * Why signing in or creating an account failed, in Swedish.
 *
 * This says what the server actually reported and nothing more. The first version guessed — every
 * sign-up failure came out as "is the email or the handle already taken?" — which sent the project
 * owner looking for an account that did not exist when the real answer was a missing field. A
 * message that names the wrong cause is worse than one that names none.
 *
 * The codes come from Better Auth's `BASE_ERROR_CODES`, plus `INVALID_HANDLE`, which is ours
 * (DEC-027). `FAILED_TO_CREATE_USER` is the write being refused, and the only unique column a
 * caller can collide with beyond the email is the handle — so it is reported as a likely taken
 * handle rather than as an unexplained failure.
 */
export function describeAuthFailure(
  mode: "SIGN_IN" | "SIGN_UP",
  code: string | undefined,
): string {
  switch (code) {
    case "INVALID_HANDLE":
      return "Vänkoden fungerar inte. 3-20 tecken: a-z, 0-9 och _, och den måste börja med en bokstav.";
    case "MISSING_FIELD":
      // Every field the form collects is `required`, so an empty one cannot get this far: the
      // usual cause is a page loaded before the last deploy, still submitting the old fields.
      return "Något fält saknades. Ladda om sidan och försök igen.";
    case "PASSWORD_TOO_SHORT":
      return "Lösenordet är för kort. Minst 8 tecken.";
    case "PASSWORD_TOO_LONG":
      return "Lösenordet är för långt.";
    case "INVALID_EMAIL":
      return "E-postadressen ser inte ut som en adress.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "E-postadressen har redan ett konto.";
    case "FAILED_TO_CREATE_USER":
      return "Kontot kunde inte skapas. Vänkoden är antagligen redan tagen.";
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
      return "Fel e-post eller lösenord.";
    default:
      return mode === "SIGN_IN"
        ? "Det gick inte att logga in. Försök igen."
        : "Kontot kunde inte skapas. Försök igen.";
  }
}
