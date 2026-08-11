import type { GameError, GameErrorCode } from "../../game/model/gameError";

/**
 * Translates engine error codes into Swedish user-facing text (architecture.md section 25):
 * the engine stays presentation-language-free, and only this layer knows the wording.
 */
const ERROR_MESSAGES: Record<GameErrorCode, string> = {
  GAME_NOT_ACTIVE: "Spelet är inte aktivt just nu.",
  NOT_YOUR_TURN: "Det är inte din tur.",
  INVALID_GAME_STATE: "Åtgärden går inte att utföra just nu.",
  TILE_NOT_IN_RACK: "Den brickan finns inte i din hand.",
  INVALID_TILE: "Ogiltig bricka.",
  INVALID_PLACEMENT: "Brickan kan inte placeras där.",
  BLANK_LETTER_REQUIRED: "Välj vilken bokstav den blanka brickan ska vara.",
  UNEXPECTED_BLANK_LETTER: "Den här brickan är inte blank.",
  INVALID_BLANK_LETTER: "Ogiltig bokstav för den blanka brickan.",
  MOVE_NOT_CONNECTED: "Läggningen måste ansluta till brickor som redan finns.",
  FIRST_MOVE_MUST_COVER_CENTER: "Första ordet måste täcka mittenrutan.",
  INVALID_WORD: "Ingen giltig läggning kunde hittas.",
  FORBIDDEN_WORD: "Det här ordet är inte tillåtet.",
  PROPOSAL_NOT_AVAILABLE: "Det finns inget förslag att hantera just nu.",
  PROPOSAL_ALREADY_CONFIRMED: "Förslaget har redan bekräftats.",
  NOT_AUTHORIZED_TO_APPROVE: "Du kan inte godkänna den här läggningen.",
  EXCHANGE_NOT_ALLOWED:
    "Det finns inte tillräckligt med brickor kvar i påsen för att byta.",
};

export function describeGameError(error: GameError): string {
  return ERROR_MESSAGES[error.code];
}
