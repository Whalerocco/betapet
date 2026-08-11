import { describe, expect, it } from "vitest";
import { createSwedishWordClassificationRules } from "../dictionary/swedishWordClassificationRules";
import { buildEngineTestGame } from "../testing/fixtures";
import { pass } from "./pass";
import { placeTile } from "./placeTile";
import { submitMove } from "./submitMove";

const rules = createSwedishWordClassificationRules();

/**
 * Milestone 2.6 exit criterion (roadmap.md section 17): "A complete game can start, progress,
 * and finish entirely through engine actions." Plays a real dictionary word (BIL, Swedish for
 * "car") through the full placeTile/submitMove commit pipeline, then drives the game to
 * completion purely through pass actions, without touching any UI layer.
 */
describe("full game flow", () => {
  it("commits a real word move, then reaches FINISHED via consecutive passes", () => {
    const setup = buildEngineTestGame({
      playerOneRackLetters: ["B", "I", "L", "A", "R", "E", "N"],
    });
    const [b, i, l] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;

    let state = setup.state;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const placed = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      expect(placed.success).toBe(true);
      if (!placed.success) return;
      state = placed.state;
    }

    const submitted = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );
    expect(submitted.success).toBe(true);
    if (!submitted.success) return;
    state = submitted.state;

    expect(state.status).toBe("ACTIVE");
    expect(state.currentPlayerId).toBe(setup.playerTwoId);
    const playerOne = state.players.find((p) => p.id === setup.playerOneId)!;
    expect(playerOne.score).toBeGreaterThan(0);
    expect(playerOne.rack.tileIds.length).toBe(setup.configuration.rackSize);
    const lastEvent = state.history.events[state.history.events.length - 1];
    expect(lastEvent.type).toBe("WORD_MOVE_COMMITTED");
    if (lastEvent.type === "WORD_MOVE_COMMITTED") {
      expect(lastEvent.payload.words).toEqual(["BIL"]);
    }

    const players = [setup.playerTwoId, setup.playerOneId];
    for (let i = 0; i < 4; i++) {
      const result = pass(state, players[i % 2]);
      expect(result.success).toBe(true);
      if (!result.success) return;
      state = result.state;
    }

    expect(state.status).toBe("FINISHED");
    if (state.status !== "FINISHED") return;
    expect(state.result.endReason).toBe("CONSECUTIVE_PASSES");
    const finishedPlayerOne = state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    expect(state.result.finalScores[setup.playerOneId]).toBe(
      finishedPlayerOne.score -
        finishedPlayerOne.rack.tileIds.reduce(
          (sum, id) => sum + state.tiles[id].points,
          0,
        ),
    );
  });
});
