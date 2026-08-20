"use client";

import { useEffect, useMemo, useState } from "react";
import { loadLanguageClassificationRulesFor } from "../application/language/loadLanguageClassificationRules";
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
import type { LanguageCode } from "../game/model/language";
import type { ModifierId } from "../game/model/modifiers";

type View =
  | { readonly type: "START" }
  | { readonly type: "CONFIRM_NEW_GAME" }
  | { readonly type: "SETUP" }
  | { readonly type: "RESUMING" }
  | {
      readonly type: "PLAYING";
      readonly initialState: GameState;
      readonly deps: GameControllerDependencies;
      readonly isResumed: boolean;
    };

interface SavedGameSummary {
  readonly state: GameState;
  readonly rackSize: RackSize;
  readonly modifiers: ReadonlySet<ModifierId>;
  readonly polyglotLanguages: readonly LanguageCode[];
  readonly wildLanguages: readonly LanguageCode[];
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
      setSavedGame({
        state: result.state,
        rackSize: result.rackSize,
        modifiers: result.modifiers,
        polyglotLanguages: result.polyglotLanguages,
        wildLanguages: result.wildLanguages,
      });
    } else if (result.status === "INCOMPATIBLE") {
      setLoadError(true);
    }
  }, []);

  /**
   * Resolves Polyglot/Wild's extra dictionaries (dynamic import, code-split per language — see
   * loadLanguageClassificationRules.ts) only when those modifiers are actually selected, so a
   * plain Swedish-only game never pays for languages it doesn't use.
   */
  async function buildDeps(
    rackSize: RackSize,
    modifiers: ReadonlySet<ModifierId>,
    polyglotLanguages: readonly LanguageCode[],
    wildLanguages: readonly LanguageCode[],
  ): Promise<GameControllerDependencies> {
    const [polyglotClassificationRules, wildClassificationRules] =
      await Promise.all([
        modifiers.has("POLYGLOT")
          ? loadLanguageClassificationRulesFor(polyglotLanguages)
          : undefined,
        modifiers.has("WILD")
          ? loadLanguageClassificationRulesFor(wildLanguages)
          : undefined,
      ]);
    return {
      configuration: createSwedishGameConfiguration(
        rackSize,
        modifiers,
        polyglotLanguages,
        wildLanguages,
      ),
      classificationRules,
      polyglotClassificationRules,
      wildClassificationRules,
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

  async function handleStartGame(values: GameSetupValues) {
    const initialState = createGame({
      playerOneName: values.playerOneName,
      playerTwoName: values.playerTwoName,
      rackSize: values.rackSize,
      modifiers: values.modifiers,
      polyglotLanguages: values.polyglotLanguages,
      wildLanguages: values.wildLanguages,
    });
    const deps = await buildDeps(
      values.rackSize,
      values.modifiers,
      values.polyglotLanguages,
      values.wildLanguages,
    );
    saveLocalGame(
      initialState,
      values.rackSize,
      values.modifiers,
      values.polyglotLanguages,
      values.wildLanguages,
    );
    setView({
      type: "PLAYING",
      initialState,
      deps,
      isResumed: false,
    });
  }

  async function handleResumeGame() {
    if (!savedGame) return;
    setView({ type: "RESUMING" });
    const deps = await buildDeps(
      savedGame.rackSize,
      savedGame.modifiers,
      savedGame.polyglotLanguages,
      savedGame.wildLanguages,
    );
    setView({
      type: "PLAYING",
      initialState: savedGame.state,
      deps,
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

  if (view.type === "RESUMING") {
    return (
      <main>
        <p role="status">Förbereder spelet…</p>
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
