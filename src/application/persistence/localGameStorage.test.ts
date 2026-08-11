import { beforeEach, describe, expect, it } from "vitest";
import { SWEDISH_CONFIGURATION_ID } from "../../game/configuration/swedishConfiguration";
import { buildEngineTestGame } from "../../game/testing/fixtures";
import {
  clearLocalGame,
  loadLocalGame,
  saveLocalGame,
} from "./localGameStorage";

const STORAGE_KEY = "betapet:local-game";

beforeEach(() => {
  window.localStorage.clear();
});

describe("saveLocalGame / loadLocalGame", () => {
  it("reports NONE when nothing has been saved", () => {
    expect(loadLocalGame()).toEqual({ status: "NONE" });
  });

  it("round-trips a saved game state and rack size", () => {
    const { state } = buildEngineTestGame();
    const stateWithRealConfigId = {
      ...state,
      configurationId: SWEDISH_CONFIGURATION_ID,
    };

    saveLocalGame(stateWithRealConfigId, 7);
    const result = loadLocalGame();

    expect(result.status).toBe("LOADED");
    if (result.status !== "LOADED") return;
    expect(result.rackSize).toBe(7);
    expect(result.state.id).toBe(stateWithRealConfigId.id);
    expect(result.state.players).toEqual(stateWithRealConfigId.players);
  });

  it("clearLocalGame removes the saved game", () => {
    const { state } = buildEngineTestGame();
    saveLocalGame({ ...state, configurationId: SWEDISH_CONFIGURATION_ID }, 7);
    clearLocalGame();

    expect(loadLocalGame()).toEqual({ status: "NONE" });
  });

  it("treats corrupt JSON as INCOMPATIBLE rather than throwing", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");

    expect(loadLocalGame()).toEqual({ status: "INCOMPATIBLE" });
  });

  it("treats a structurally implausible save as INCOMPATIBLE", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));

    expect(loadLocalGame()).toEqual({ status: "INCOMPATIBLE" });
  });

  it("treats a mismatched schema version as INCOMPATIBLE", () => {
    const { state } = buildEngineTestGame();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 999,
        configurationId: SWEDISH_CONFIGURATION_ID,
        rackSize: 7,
        savedAt: new Date().toISOString(),
        gameState: state,
      }),
    );

    expect(loadLocalGame()).toEqual({ status: "INCOMPATIBLE" });
  });

  it("treats a mismatched configuration id as INCOMPATIBLE", () => {
    const { state } = buildEngineTestGame();
    saveLocalGame({ ...state, configurationId: "some-other-config" }, 7);

    expect(loadLocalGame()).toEqual({ status: "INCOMPATIBLE" });
  });

  it("treats a structurally invalid GameState as INCOMPATIBLE", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        configurationId: SWEDISH_CONFIGURATION_ID,
        rackSize: 7,
        savedAt: new Date().toISOString(),
        gameState: { not: "a valid game state" },
      }),
    );

    expect(loadLocalGame()).toEqual({ status: "INCOMPATIBLE" });
  });
});
