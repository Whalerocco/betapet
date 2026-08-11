"use client";

import { useEffect, useMemo, useState } from "react";
import type { GameControllerDependencies } from "../application/game-controller/gameController";
import {
  clearLocalGame,
  loadLocalGame,
  saveLocalGame,
} from "../application/persistence/localGameStorage";
import { GameScreen } from "../components/game/GameScreen";
import { GameSetup, type GameSetupValues } from "../components/game/GameSetup";
import { NewGameConfirmation } from "../components/game/NewGameConfirmation";
import { StartScreen } from "../components/game/StartScreen";
import { SWEDISH_ALPHABET } from "../game/configuration/swedishAlphabet";
import { createSwedishGameConfiguration } from "../game/configuration/swedishConfiguration";
import { createSwedishWordClassificationRules } from "../game/dictionary/swedishWordClassificationRules";
import { createGame } from "../game/engine/createGame";
import type { GameState } from "../game/model/game";
import type { RackSize } from "../game/model/gameConfiguration";

type View =
  | { readonly type: "START" }
  | { readonly type: "CONFIRM_NEW_GAME" }
  | { readonly type: "SETUP" }
  | {
      readonly type: "PLAYING";
      readonly initialState: GameState;
      readonly deps: GameControllerDependencies;
      readonly isResumed: boolean;
    };

interface SavedGameSummary {
  readonly state: GameState;
  readonly rackSize: RackSize;
}

export default function Home() {
  const [view, setView] = useState<View>({ type: "START" });
  const [savedGame, setSavedGame] = useState<SavedGameSummary | undefined>();
  const [loadError, setLoadError] = useState(false);
  const classificationRules = useMemo(
    () => createSwedishWordClassificationRules(),
    [],
  );

  useEffect(() => {
    // Reading localStorage must stay out of the render/lazy-initializer path: the server has
    // no localStorage, so doing this synchronously during render would produce a hydration
    // mismatch. This mount-only effect is the standard way to sync from that external system.
    const result = loadLocalGame();
    if (result.status === "LOADED") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSavedGame({ state: result.state, rackSize: result.rackSize });
    } else if (result.status === "INCOMPATIBLE") {
      setLoadError(true);
    }
  }, []);

  function buildDeps(rackSize: RackSize): GameControllerDependencies {
    return {
      configuration: createSwedishGameConfiguration(rackSize),
      classificationRules,
      alphabet: SWEDISH_ALPHABET,
    };
  }

  function handleRequestNewGame() {
    if (savedGame && savedGame.state.status === "ACTIVE") {
      setView({ type: "CONFIRM_NEW_GAME" });
      return;
    }
    setView({ type: "SETUP" });
  }

  function handleConfirmNewGame() {
    clearLocalGame();
    setSavedGame(undefined);
    setLoadError(false);
    setView({ type: "SETUP" });
  }

  function handleStartGame(values: GameSetupValues) {
    const initialState = createGame({
      playerOneName: values.playerOneName,
      playerTwoName: values.playerTwoName,
      rackSize: values.rackSize,
    });
    saveLocalGame(initialState, values.rackSize);
    setView({
      type: "PLAYING",
      initialState,
      deps: buildDeps(values.rackSize),
      isResumed: false,
    });
  }

  function handleResumeGame() {
    if (!savedGame) return;
    setView({
      type: "PLAYING",
      initialState: savedGame.state,
      deps: buildDeps(savedGame.rackSize),
      isResumed: true,
    });
  }

  function handleExitToStart() {
    clearLocalGame();
    setSavedGame(undefined);
    setView({ type: "START" });
  }

  if (view.type === "START") {
    return (
      <main>
        <StartScreen
          onStartNewGame={handleRequestNewGame}
          onResumeGame={savedGame ? handleResumeGame : undefined}
          loadError={loadError}
        />
      </main>
    );
  }

  if (view.type === "CONFIRM_NEW_GAME") {
    return (
      <main>
        <NewGameConfirmation
          onCancel={() => setView({ type: "START" })}
          onConfirm={handleConfirmNewGame}
        />
      </main>
    );
  }

  if (view.type === "SETUP") {
    return (
      <main>
        <GameSetup onStartGame={handleStartGame} />
      </main>
    );
  }

  return (
    <main>
      <GameScreen
        initialState={view.initialState}
        deps={view.deps}
        isResumed={view.isResumed}
        onExit={handleExitToStart}
      />
    </main>
  );
}
