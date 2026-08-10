import { describe, expect, it } from "vitest";
import { createHistoryEventId, createPlayerId } from "./ids";
import { addHistoryEvent, createGameHistory, nextSequence } from "./history";

describe("game history", () => {
  it("starts empty", () => {
    const history = createGameHistory();
    expect(history.events).toEqual([]);
    expect(nextSequence(history)).toBe(0);
  });

  it("appends a structured event", () => {
    const history = createGameHistory();
    const updated = addHistoryEvent(history, {
      id: createHistoryEventId(),
      sequence: 0,
      type: "GAME_STARTED",
      payload: {},
    });
    expect(updated.events).toHaveLength(1);
    expect(nextSequence(updated)).toBe(1);
  });

  it("stores structured data rather than presentation text for a pass", () => {
    const playerId = createPlayerId();
    const history = addHistoryEvent(createGameHistory(), {
      id: createHistoryEventId(),
      sequence: 0,
      type: "PASS",
      playerId,
      payload: {},
    });
    const event = history.events[0];
    expect(event.type).toBe("PASS");
    if (event.type === "PASS") {
      expect(event.playerId).toBe(playerId);
    }
  });

  it("rejects an event with the wrong sequence number", () => {
    const history = createGameHistory();
    expect(() =>
      addHistoryEvent(history, {
        id: createHistoryEventId(),
        sequence: 5,
        type: "GAME_STARTED",
        payload: {},
      }),
    ).toThrow();
  });

  it("does not mutate the original history", () => {
    const history = createGameHistory();
    addHistoryEvent(history, {
      id: createHistoryEventId(),
      sequence: 0,
      type: "GAME_STARTED",
      payload: {},
    });
    expect(history.events).toHaveLength(0);
  });
});
