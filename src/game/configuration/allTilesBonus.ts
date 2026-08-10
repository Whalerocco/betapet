import type { RackSize } from "../model/gameConfiguration";

/** Bonus awarded for playing an entire rack in one move, per game-rules.md section 25. */
export const ALL_TILES_BONUS_BY_RACK_SIZE: Readonly<Record<RackSize, number>> =
  {
    6: 40,
    7: 50,
    8: 60,
  };

export function getAllTilesBonus(rackSize: RackSize): number {
  return ALL_TILES_BONUS_BY_RACK_SIZE[rackSize];
}
