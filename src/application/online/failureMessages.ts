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
