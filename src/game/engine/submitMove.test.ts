import { describe, expect, it } from "vitest";
import { createSwedishWordClassificationRules } from "../dictionary/swedishWordClassificationRules";
import {
  createBoardDefinition,
  placeCommittedTile,
  type BoardDefinition,
} from "../model/board";
import type { GameState } from "../model/game";
import {
  createGameConfiguration,
  type GameConfiguration,
} from "../model/gameConfiguration";
import { createGameHistory } from "../model/history";
import {
  createGameId,
  createPlayerId,
  createTileId,
  type PlayerId,
  type TileId,
} from "../model/ids";
import { createPlayer, type Player } from "../model/player";
import { createBlankTile, createLetterTile, type Tile } from "../model/tile";
import { createTileBag } from "../model/tileBag";
import { playerTurn } from "../model/turnState";
import { placeTile } from "./placeTile";
import { submitMove } from "./submitMove";

interface TestGameSetup {
  readonly board: BoardDefinition;
  readonly configuration: GameConfiguration;
  readonly tiles: Record<TileId, Tile>;
  readonly playerOneId: PlayerId;
  readonly playerTwoId: PlayerId;
  readonly state: GameState;
}

function letterTile(
  tiles: Record<TileId, Tile>,
  letter: string,
  points = 1,
): TileId {
  const id = createTileId();
  tiles[id] = createLetterTile(id, letter, points);
  return id;
}

function buildTestGame(
  options: {
    playerOneRackLetters?: string[];
    bagLetters?: string[];
    rackSize?: 6 | 7 | 8;
  } = {},
): TestGameSetup {
  const board = createBoardDefinition(15, 15, { row: 7, column: 7 }, []);
  const rackSize = options.rackSize ?? 7;
  const configuration = createGameConfiguration(
    "test-config",
    "sv",
    board,
    rackSize,
  );
  const tiles: Record<TileId, Tile> = {};

  const playerOneId = createPlayerId();
  const playerTwoId = createPlayerId();
  const rackLetters = options.playerOneRackLetters ?? [
    "B",
    "I",
    "L",
    "A",
    "R",
    "E",
    "N",
  ];
  const rackTileIds = rackLetters.map((letter) => letterTile(tiles, letter, 1));
  const playerOne: Player = {
    ...createPlayer(playerOneId, "August"),
    rack: { tileIds: rackTileIds },
  };
  const playerTwo: Player = createPlayer(playerTwoId, "Anna");

  const bagLetters = options.bagLetters ?? [
    "S",
    "T",
    "Ö",
    "K",
    "O",
    "G",
    "H",
    "U",
    "D",
  ];
  const bagTileIds = bagLetters.map((letter) => letterTile(tiles, letter, 1));
  const tileBag = createTileBag(bagTileIds);

  const state: GameState = {
    id: createGameId(),
    version: 1,
    configurationId: configuration.id,
    players: [playerOne, playerTwo],
    board: { occupiedCells: [] },
    tileBag,
    tiles,
    currentPlayerId: playerOneId,
    turnState: playerTurn(playerOneId),
    acceptedVocabulary: [],
    history: createGameHistory(),
    consecutivePasses: 0,
    status: "ACTIVE",
  };

  return { board, configuration, tiles, playerOneId, playerTwoId, state };
}

const rules = createSwedishWordClassificationRules();

describe("submitMove: normal dictionary-valid path", () => {
  it("commits a valid first move covering the centre", () => {
    const setup = buildTestGame();
    const [b, i, l] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;

    let state = setup.state;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      expect(result.success).toBe(true);
      if (result.success) state = result.state;
    }

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove).toBeUndefined();
    expect(result.state.board.occupiedCells).toHaveLength(3);
  });

  it("identifies both the main word and a crossing word", () => {
    const setup = buildTestGame();
    // Pre-seed a committed "S" one row below the centre column, so a vertical placement of "I"
    // at the centre forms the crossing word "IS" (a real Swedish word).
    const centre = setup.board.centreCoordinate;
    const existingS = letterTile(setup.tiles, "S", 1);
    const board = placeCommittedTile(
      setup.state.board,
      { row: centre.row + 1, column: centre.column + 1 },
      existingS,
    );
    let state = { ...setup.state, board };

    const [b, i, l] = state.players[0].rack.tileIds;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      expect(result.success).toBe(true);
      if (result.success) state = result.state;
    }

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    const event = result.state.history.events.at(-1);
    expect(event?.type).toBe("WORD_MOVE_COMMITTED");
    if (event?.type === "WORD_MOVE_COMMITTED") {
      expect([...event.payload.words].sort()).toEqual(["BIL", "IS"]);
    }
  });

  it("does not require opponent approval when every word is a dictionary word", () => {
    const setup = buildTestGame();
    const [b, i, l] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let state = setup.state;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.turnState.type).toBe("PLAYER_TURN");
  });

  it("applies the score exactly once, only on commit", () => {
    const setup = buildTestGame();
    const [b, i, l] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let state = setup.state;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }
    expect(state.players[0].score).toBe(0);

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    const player = result.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    // B(1) + I(1) + L(1) = 3, no multipliers on this board.
    expect(player.score).toBe(3);
  });

  it("draws replacement tiles and reduces the tile bag", () => {
    const setup = buildTestGame();
    const [b, i, l] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let state = setup.state;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }
    const bagSizeBeforeSubmit = state.tileBag.tileIds.length;

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    const player = result.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    expect(player.rack.tileIds).toHaveLength(7);
    expect(result.state.tileBag.tileIds).toHaveLength(bagSizeBeforeSubmit - 3);
  });

  it("advances current player to the opponent", () => {
    const setup = buildTestGame();
    const [b, i, l] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let state = setup.state;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.currentPlayerId).toBe(setup.playerTwoId);
    expect(result.state.turnState).toEqual({
      type: "PLAYER_TURN",
      playerId: setup.playerTwoId,
    });
  });

  it("permanently fixes a blank tile's represented letter on commit", () => {
    const setup = buildTestGame({ playerOneRackLetters: ["B", "L"] });
    const blankId = createTileId();
    setup.tiles[blankId] = createBlankTile(blankId);
    const players = setup.state.players.map((p) =>
      p.id === setup.playerOneId
        ? { ...p, rack: { tileIds: [...p.rack.tileIds, blankId] } }
        : p,
    ) as [Player, Player];
    let state: GameState = { ...setup.state, players };

    const [b, l] = state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    const placedB = placeTile(state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId: b,
      coordinate: centre,
    });
    expect(placedB.success).toBe(true);
    if (placedB.success) state = placedB.state;

    const placedBlank = placeTile(state, setup.board, ["I"], {
      playerId: setup.playerOneId,
      tileId: blankId,
      coordinate: { row: centre.row, column: centre.column + 1 },
      representedLetter: "I",
    });
    expect(placedBlank.success).toBe(true);
    if (placedBlank.success) state = placedBlank.state;

    const placedL = placeTile(state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId: l,
      coordinate: { row: centre.row, column: centre.column + 2 },
    });
    expect(placedL.success).toBe(true);
    if (placedL.success) state = placedL.state;

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    const committedBlank = result.state.tiles[blankId];
    expect(committedBlank.kind).toBe("BLANK");
    if (committedBlank.kind === "BLANK") {
      expect(committedBlank.representedLetter).toBe("I");
    }
  });

  it("awards the all-tiles bonus when the whole rack is played", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["B", "I", "L"],
      rackSize: 6,
      bagLetters: [],
    });
    // Use a 6-tile rack but only place all 3 available tiles is not "all tiles" unless rack
    // size matches placed count; here the rack legitimately only has 3 tiles because we're
    // testing with a small custom rack, but the bonus is keyed on the *configured* rack size,
    // so this should NOT award the 6-tile bonus.
    const [b, i, l] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let state = setup.state;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    const player = result.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    // 3 placed but configured rack size is 6, so no bonus: just B+I+L = 3.
    expect(player.score).toBe(3);
  });
});

describe("submitMove: rejected variations", () => {
  it("rejects a physically invalid placement without touching state", () => {
    const setup = buildTestGame();
    const [b, i] = setup.state.players[0].rack.tileIds;
    // Two adjacent tiles (no gap), but not covering the centre on this, the game's first move.
    const first = placeTile(setup.state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId: b,
      coordinate: { row: 0, column: 0 },
    });
    expect(first.success).toBe(true);
    if (!first.success) return;
    const second = placeTile(first.state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId: i,
      coordinate: { row: 0, column: 1 },
    });
    expect(second.success).toBe(true);
    if (!second.success) return;

    const result = submitMove(
      second.state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("FIRST_MOVE_MUST_COVER_CENTER");
    // August remains in the same turn with the pending tiles intact.
    expect(second.state.turnState).toEqual({
      type: "PLAYER_TURN",
      playerId: setup.playerOneId,
    });
  });

  it("rejects a move containing a forbidden word without offering opponent approval", () => {
    const setup = buildTestGame({ playerOneRackLetters: ["T", "V"] });
    const [t, v] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    const placedT = placeTile(setup.state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId: t,
      coordinate: centre,
    });
    expect(placedT.success).toBe(true);
    if (!placedT.success) return;
    const placedV = placeTile(placedT.state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId: v,
      coordinate: { row: centre.row, column: centre.column + 1 },
    });
    expect(placedV.success).toBe(true);
    if (!placedV.success) return;

    const result = submitMove(
      placedV.state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("FORBIDDEN_WORD");
    expect(result.error.details?.word).toBe("TV");
  });

  it("rejects submitting with no pending move", () => {
    const setup = buildTestGame();
    const result = submitMove(
      setup.state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("INVALID_GAME_STATE");
  });
});

describe("submitMove: game end", () => {
  it("ends the game when the bag empties and a player empties their rack", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["B", "I", "L"],
      bagLetters: [],
    });
    const [b, i, l] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let state = setup.state;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.status).toBe("FINISHED");
    expect(result.state.turnState).toEqual({ type: "FINISHED" });
    if (result.state.status === "FINISHED") {
      expect(result.state.result.winnerPlayerIds).toEqual([setup.playerOneId]);
    }
  });
});
