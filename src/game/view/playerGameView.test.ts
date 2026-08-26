import { describe, expect, it } from "vitest";
import { placeCommittedTile } from "../model/board";
import { createGameState, type GameState } from "../model/game";
import { createGameResult } from "../model/gameResult";
import { createPlayerId, createTileId, type TileId } from "../model/ids";
import { createLetterTile } from "../model/tile";
import {
  finishedTurnState,
  requiresPlayerConfirmation,
  waitingForOpponentApproval,
} from "../model/turnState";
import { buildEngineTestGame } from "../testing/fixtures";
import { placeTile } from "../engine/placeTile";
import { isPendingMoveVisibleTo, toPlayerGameView } from "./playerGameView";

/** A game with a committed tile on the board and known tiles in both hands and the bag. */
function game() {
  const setup = buildEngineTestGame({
    playerOneRackLetters: ["B", "I", "L"],
    bagLetters: ["X", "Y", "Z"],
  });
  const committedTileId = createTileId();
  setup.tiles[committedTileId] = createLetterTile(committedTileId, "K", 3);
  const board = placeCommittedTile(
    setup.state.board,
    setup.board.centreCoordinate,
    committedTileId,
  );

  // Give player two a hand of their own; the fixture leaves it empty.
  const opponentTileIds = ["Q", "R"].map((letter) => {
    const id = createTileId();
    setup.tiles[id] = createLetterTile(id, letter, 1);
    return id;
  });
  const state = createGameState({
    ...setup.state,
    board,
    players: [
      setup.state.players[0],
      { ...setup.state.players[1], rack: { tileIds: opponentTileIds } },
    ],
  });

  return {
    state,
    setup,
    committedTileId,
    opponentTileIds,
    bagTileIds: state.tileBag.tileIds,
  };
}

describe("toPlayerGameView", () => {
  it("shows the viewer their own hand, in full", () => {
    const { state, setup } = game();

    const view = toPlayerGameView(state, setup.playerOneId);

    expect(view.ownRack.tileIds).toEqual(state.players[0].rack.tileIds);
    for (const tileId of view.ownRack.tileIds) {
      expect(view.tiles[tileId]).toBeDefined();
    }
  });

  it("gives the opponent's hand as a count and nothing else", () => {
    const { state, setup, opponentTileIds } = game();

    const view = toPlayerGameView(state, setup.playerOneId);

    expect(view.opponentRackCount).toBe(2);
    for (const tileId of opponentTileIds) {
      expect(view.tiles[tileId]).toBeUndefined();
    }
  });

  it("gives the bag as a count, never its contents or order", () => {
    const { state, setup, bagTileIds } = game();

    const view = toPlayerGameView(state, setup.playerOneId);

    expect(view.tilesRemainingInBag).toBe(bagTileIds.length);
    expect(view).not.toHaveProperty("tileBag");
    for (const tileId of bagTileIds) {
      expect(view.tiles[tileId]).toBeUndefined();
    }
  });

  it("identifies the tiles committed to the board, which are public", () => {
    const { state, setup, committedTileId } = game();

    const view = toPlayerGameView(state, setup.playerOneId);

    expect(view.tiles[committedTileId]).toEqual(state.tiles[committedTileId]);
    expect(view.board).toEqual(state.board);
  });

  it("keeps both players' names and scores, which are public", () => {
    const { state, setup } = game();

    const view = toPlayerGameView(state, setup.playerOneId);

    expect(view.players.map((p) => p.name)).toEqual(
      state.players.map((p) => p.name),
    );
    expect(view.players.map((p) => p.score)).toEqual([0, 0]);
    // Nothing rack-shaped rides along on the player summaries.
    for (const player of view.players) {
      expect(player).not.toHaveProperty("rack");
    }
  });

  it("refuses to build a view for someone who is not in the game", () => {
    const { state } = game();

    expect(() => toPlayerGameView(state, createPlayerId())).toThrow(
      /not a player in this game/,
    );
  });

  it("includes the final result once the game is over, still without the opponent's hand", () => {
    const { state, setup, opponentTileIds } = game();
    const finished: GameState = createGameState({
      ...state,
      status: "FINISHED",
      turnState: finishedTurnState(),
      result: createGameResult(
        { [setup.playerOneId]: 10, [setup.playerTwoId]: 8 },
        [setup.playerOneId],
        { [setup.playerOneId]: 0, [setup.playerTwoId]: 2 },
        "NO_TILES_AND_NO_MORE_PLAY",
      ),
    });

    const view = toPlayerGameView(finished, setup.playerOneId);

    expect(view.result?.winnerPlayerIds).toEqual([setup.playerOneId]);
    for (const tileId of opponentTileIds) {
      expect(view.tiles[tileId]).toBeUndefined();
    }
  });
});

describe("toPlayerGameView: a move being composed", () => {
  /** Player one has placed a tile but not submitted it. */
  function withPendingMove() {
    const context = game();
    const [firstTileId] = context.state.players[0].rack.tileIds;
    const placed = placeTile(context.state, context.setup.board, [], {
      playerId: context.setup.playerOneId,
      tileId: firstTileId,
      coordinate: {
        row: context.setup.board.centreCoordinate.row,
        column: context.setup.board.centreCoordinate.column + 1,
      },
    });
    if (!placed.success) throw new Error("setup failed");
    return { ...context, state: placed.state, pendingTileId: firstTileId };
  }

  it("shows it to the player composing it", () => {
    const { state, setup, pendingTileId } = withPendingMove();

    const view = toPlayerGameView(state, setup.playerOneId);

    expect(view.pendingMove?.placedTiles).toHaveLength(1);
    expect(view.tiles[pendingTileId]).toBeDefined();
  });

  it("hides it from the opponent until it is proposed to them", () => {
    const { state, setup, pendingTileId } = withPendingMove();

    const view = toPlayerGameView(state, setup.playerTwoId);

    // Watching letters appear and disappear would give away the hand before the move is played.
    expect(view.pendingMove).toBeUndefined();
    expect(view.tiles[pendingTileId]).toBeUndefined();
  });

  it("hides it from the opponent while the proposer is still deciding", () => {
    const { state, setup } = withPendingMove();
    const deciding = createGameState({
      ...state,
      turnState: requiresPlayerConfirmation(setup.playerOneId),
    });

    expect(isPendingMoveVisibleTo(deciding, setup.playerTwoId)).toBe(false);
    expect(
      toPlayerGameView(deciding, setup.playerTwoId).pendingMove,
    ).toBeUndefined();
  });

  it("shows it to the reviewer once it is awaiting their approval", () => {
    const { state, setup, pendingTileId } = withPendingMove();
    const awaitingApproval = createGameState({
      ...state,
      turnState: waitingForOpponentApproval(
        setup.playerOneId,
        setup.playerTwoId,
      ),
    });

    const view = toPlayerGameView(awaitingApproval, setup.playerTwoId);

    // They are being asked to judge the move, so they have to be able to read it.
    expect(view.pendingMove?.placedTiles).toHaveLength(1);
    expect(view.tiles[pendingTileId]).toBeDefined();
  });
});

describe("toPlayerGameView: nothing hidden survives serialization", () => {
  /**
   * The property that matters is what a view does *not* contain, and a client receives it as
   * JSON. Sweeping the serialized text for identifiers that should never appear catches a leak
   * anywhere in the structure — including somewhere nobody thought to write an assertion for.
   */
  function assertAbsentFromJson(view: unknown, tileIds: readonly TileId[]) {
    const json = JSON.stringify(view);
    for (const tileId of tileIds) {
      expect(json).not.toContain(tileId);
    }
  }

  it("carries no trace of the opponent's hand or the bag", () => {
    const { state, setup, opponentTileIds, bagTileIds } = game();

    const view = toPlayerGameView(state, setup.playerOneId);

    assertAbsentFromJson(view, [...opponentTileIds, ...bagTileIds]);
  });

  it("carries no trace of a move the viewer is not party to", () => {
    const context = game();
    const [firstTileId] = context.state.players[0].rack.tileIds;
    const placed = placeTile(context.state, context.setup.board, [], {
      playerId: context.setup.playerOneId,
      tileId: firstTileId,
      coordinate: {
        row: context.setup.board.centreCoordinate.row,
        column: context.setup.board.centreCoordinate.column + 1,
      },
    });
    if (!placed.success) throw new Error("setup failed");

    const opponentView = toPlayerGameView(
      placed.state,
      context.setup.playerTwoId,
    );

    assertAbsentFromJson(opponentView, [
      firstTileId,
      ...context.state.players[0].rack.tileIds,
    ]);
  });

  it("shows each player their own hand and only their own", () => {
    const { state, setup } = game();

    const one = toPlayerGameView(state, setup.playerOneId);
    const two = toPlayerGameView(state, setup.playerTwoId);

    assertAbsentFromJson(one, two.ownRack.tileIds);
    assertAbsentFromJson(two, one.ownRack.tileIds);
  });
});
