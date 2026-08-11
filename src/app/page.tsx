"use client";

import { useMemo, useState } from "react";
import type { GameControllerDependencies } from "../application/game-controller/gameController";
import { GameScreen } from "../components/game/GameScreen";
import { GameSetup, type GameSetupValues } from "../components/game/GameSetup";
import { StartScreen } from "../components/game/StartScreen";
import { SWEDISH_ALPHABET } from "../game/configuration/swedishAlphabet";
import { createSwedishGameConfiguration } from "../game/configuration/swedishConfiguration";
import { createSwedishWordClassificationRules } from "../game/dictionary/swedishWordClassificationRules";
import { createGame } from "../game/engine/createGame";
import type { GameState } from "../game/model/game";

type View =
  | { readonly type: "START" }
  | { readonly type: "SETUP" }
  | {
      readonly type: "PLAYING";
      readonly initialState: GameState;
      readonly deps: GameControllerDependencies;
    };

export default function Home() {
  const [view, setView] = useState<View>({ type: "START" });
  const classificationRules = useMemo(
    () => createSwedishWordClassificationRules(),
    [],
  );

  function handleStartGame(values: GameSetupValues) {
    const configuration = createSwedishGameConfiguration(values.rackSize);
    const initialState = createGame({
      playerOneName: values.playerOneName,
      playerTwoName: values.playerTwoName,
      rackSize: values.rackSize,
    });
    setView({
      type: "PLAYING",
      initialState,
      deps: {
        configuration,
        classificationRules,
        alphabet: SWEDISH_ALPHABET,
      },
    });
  }

  if (view.type === "START") {
    return (
      <main>
        <StartScreen onStartNewGame={() => setView({ type: "SETUP" })} />
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
        onExit={() => setView({ type: "START" })}
      />
    </main>
  );
}
