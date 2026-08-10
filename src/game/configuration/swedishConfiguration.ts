import { SCRABBLE_BOARD_DEFINITION } from "../../data/board/scrabbleBoard";
import {
  createGameConfiguration,
  type GameConfiguration,
  type RackSize,
} from "../model/gameConfiguration";

/**
 * The interim Swedish game configuration: Alfapet turn/scoring/word rules, with the
 * board and tile set substituted per docs/decisions.md DEC-001.
 */
export const SWEDISH_CONFIGURATION_ID = "sv-scrabble-v1";

export function createSwedishGameConfiguration(
  rackSize: RackSize,
): GameConfiguration {
  return createGameConfiguration(
    SWEDISH_CONFIGURATION_ID,
    "sv",
    SCRABBLE_BOARD_DEFINITION,
    rackSize,
  );
}
