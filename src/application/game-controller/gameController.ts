import type { WordClassificationRules } from "../../game/dictionary/classifyWord";
import { cancelProposal } from "../../game/engine/cancelProposal";
import { exchangeTiles } from "../../game/engine/exchangeTiles";
import type { ActionResult } from "../../game/engine/gameError";
import { movePendingTile } from "../../game/engine/movePendingTile";
import { pass } from "../../game/engine/pass";
import { placeTile } from "../../game/engine/placeTile";
import { removePendingTile } from "../../game/engine/removePendingTile";
import { submitMove } from "../../game/engine/submitMove";
import type { Coordinate } from "../../game/model/coordinate";
import type { GameState } from "../../game/model/game";
import type { GameConfiguration } from "../../game/model/gameConfiguration";
import type { PlayerId, TileId } from "../../game/model/ids";

export interface GameControllerDependencies {
  readonly configuration: GameConfiguration;
  readonly classificationRules: WordClassificationRules;
  readonly alphabet: readonly string[];
}

/**
 * UI interaction is converted into these explicit game actions (tech-stack.md section 11)
 * before reaching the engine. The UI never calls engine functions directly.
 */
export type GameAction =
  | {
      readonly type: "PLACE_TILE";
      readonly playerId: PlayerId;
      readonly tileId: TileId;
      readonly coordinate: Coordinate;
      readonly representedLetter?: string;
    }
  | {
      readonly type: "REMOVE_TILE";
      readonly playerId: PlayerId;
      readonly tileId: TileId;
    }
  | {
      readonly type: "MOVE_TILE";
      readonly playerId: PlayerId;
      readonly tileId: TileId;
      readonly coordinate: Coordinate;
    }
  | { readonly type: "SUBMIT_MOVE"; readonly playerId: PlayerId }
  | { readonly type: "PASS"; readonly playerId: PlayerId }
  | {
      readonly type: "EXCHANGE_TILES";
      readonly playerId: PlayerId;
      readonly tileIds: readonly TileId[];
    }
  | { readonly type: "CANCEL_PROPOSAL"; readonly playerId: PlayerId };

/**
 * The single entry point from the application layer into the game engine (architecture.md
 * section 24): the UI dispatches an action and renders whatever state comes back. It never
 * decides legality, scoring, or turn ownership itself.
 */
export function dispatchGameAction(
  state: GameState,
  deps: GameControllerDependencies,
  action: GameAction,
): ActionResult {
  switch (action.type) {
    case "PLACE_TILE":
      return placeTile(
        state,
        deps.configuration.boardDefinition,
        deps.alphabet,
        {
          playerId: action.playerId,
          tileId: action.tileId,
          coordinate: action.coordinate,
          representedLetter: action.representedLetter,
        },
      );
    case "REMOVE_TILE":
      return removePendingTile(state, {
        playerId: action.playerId,
        tileId: action.tileId,
      });
    case "MOVE_TILE":
      return movePendingTile(state, deps.configuration.boardDefinition, {
        playerId: action.playerId,
        tileId: action.tileId,
        coordinate: action.coordinate,
      });
    case "SUBMIT_MOVE":
      return submitMove(
        state,
        deps.configuration,
        deps.classificationRules,
        action.playerId,
      );
    case "PASS":
      return pass(state, action.playerId);
    case "EXCHANGE_TILES":
      return exchangeTiles(state, {
        playerId: action.playerId,
        tileIds: action.tileIds,
      });
    case "CANCEL_PROPOSAL":
      return cancelProposal(state, action.playerId);
  }
}
