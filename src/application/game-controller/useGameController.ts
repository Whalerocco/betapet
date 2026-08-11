"use client";

import { useCallback, useState } from "react";
import type { ActionResult } from "../../game/engine/gameError";
import type { GameState } from "../../game/model/game";
import {
  dispatchGameAction,
  type GameAction,
  type GameControllerDependencies,
} from "./gameController";

/**
 * Owns the authoritative GameState in React state and converts UI interaction into dispatched
 * game actions (tech-stack.md sections 10-11). React never derives its own copy of gameplay
 * state; it only renders whatever the engine returns.
 */
export function useGameController(
  initialState: GameState,
  deps: GameControllerDependencies,
) {
  const [state, setState] = useState<GameState>(initialState);

  const dispatch = useCallback(
    (action: GameAction): ActionResult => {
      const result = dispatchGameAction(state, deps, action);
      if (result.success) {
        setState(result.state);
      }
      return result;
    },
    [state, deps],
  );

  return { state, dispatch };
}
