import { SCRABBLE_BOARD_DEFINITION } from "../../data/board/scrabbleBoard";
import {
  createGameConfiguration,
  type GameConfiguration,
  type RackSize,
} from "../model/gameConfiguration";
import type { LanguageCode } from "../model/language";
import type { ModifierId } from "../model/modifiers";

/**
 * Betapet's Swedish game configuration: Alfapet turn/scoring/word rules, with the board and
 * tile set adopted as the permanent Version 1 configuration per docs/decisions.md DEC-001 and
 * DEC-009 (a real Alfapet board/tile set could not be verified).
 */
export const SWEDISH_CONFIGURATION_ID = "sv-scrabble-v1";

export function createSwedishGameConfiguration(
  rackSize: RackSize,
  modifiers: ReadonlySet<ModifierId> = new Set(),
  polyglotLanguages: readonly LanguageCode[] = [],
  wildLanguages: readonly LanguageCode[] = [],
): GameConfiguration {
  return createGameConfiguration(
    SWEDISH_CONFIGURATION_ID,
    "sv",
    SCRABBLE_BOARD_DEFINITION,
    rackSize,
    modifiers,
    polyglotLanguages,
    wildLanguages,
  );
}
