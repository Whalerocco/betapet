import {
  createBoardDefinition,
  createBoardState,
  type BoardDefinition,
} from "../model/board";
import {
  createGameId,
  createPlayerId,
  createTileId,
  type PlayerId,
  type TileId,
} from "../model/ids";
import { createPlayer, addTileToRack, type Player } from "../model/player";
import { createBlankTile, createLetterTile, type Tile } from "../model/tile";
import { createTileBag, type TileBag } from "../model/tileBag";
import { createGameHistory } from "../model/history";
import { playerTurn } from "../model/turnState";
import type { GameState } from "../model/game";
import {
  createGameConfiguration,
  type GameConfiguration,
  type RackSize,
} from "../model/gameConfiguration";

export function createTestBoardDefinition(): BoardDefinition {
  return createBoardDefinition(5, 5, { row: 2, column: 2 }, [
    { coordinate: { row: 2, column: 2 }, multiplier: "START" },
  ]);
}

/** Ten interchangeable A tiles: enough for two racks plus a small bag, without needing real Swedish tile data. */
export function createTestTiles(count = 10): {
  tiles: Record<TileId, Tile>;
  tileIds: TileId[];
} {
  const tiles: Record<TileId, Tile> = {};
  const tileIds: TileId[] = [];
  for (let i = 0; i < count; i++) {
    const id = createTileId();
    tiles[id] = createLetterTile(id, "A", 1);
    tileIds.push(id);
  }
  return { tiles, tileIds };
}

export interface TestGame {
  readonly state: GameState;
  readonly playerOneId: PlayerId;
  readonly playerTwoId: PlayerId;
}

/** Assembles a minimal, fully valid ACTIVE game: two empty-rack players and a small tile bag. */
export function createTestGame(): TestGame {
  const playerOneId = createPlayerId();
  const playerTwoId = createPlayerId();
  const playerOne: Player = createPlayer(playerOneId, "Alice");
  const playerTwo: Player = createPlayer(playerTwoId, "Bob");

  const { tiles, tileIds } = createTestTiles();
  const tileBag: TileBag = createTileBag(tileIds);

  const state: GameState = {
    id: createGameId(),
    version: 1,
    configurationId: "test-config",
    players: [playerOne, playerTwo],
    board: createBoardState(),
    tileBag,
    tiles,
    currentPlayerId: playerOneId,
    turnState: playerTurn(playerOneId),
    acceptedVocabulary: [],
    history: createGameHistory(),
    consecutivePasses: 0,
    status: "ACTIVE",
  };

  return { state, playerOneId, playerTwoId };
}

/**
 * Picks non-blank tile IDs from a player's rack. Useful in tests that don't care about blank
 * behaviour specifically: a blank tile needs a representedLetter to be placeable, so blindly
 * taking `rack.tileIds[0]` from a randomly-shuffled game is flaky.
 */
export function letterTileIdsInRack(
  state: GameState,
  playerId: PlayerId,
  count = 1,
): TileId[] {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`No such player: ${playerId}`);
  }
  const letterTileIds = player.rack.tileIds.filter(
    (id) => state.tiles[id].kind === "LETTER",
  );
  if (letterTileIds.length < count) {
    throw new Error(
      `Player ${playerId} does not have ${count} non-blank tile(s) in rack`,
    );
  }
  return letterTileIds.slice(0, count);
}

/** Relocates a tile (from wherever it currently is: bag or either rack) into a player's rack. */
export function relocateTileToRack(
  state: GameState,
  playerId: PlayerId,
  tileId: TileId,
): GameState {
  const tileBag = {
    tileIds: state.tileBag.tileIds.filter((id) => id !== tileId),
  };
  const players = state.players.map((p): Player => ({
    ...p,
    rack: { tileIds: p.rack.tileIds.filter((id) => id !== tileId) },
  })) as [Player, Player];
  const targetIndex = players.findIndex((p) => p.id === playerId);
  players[targetIndex] = {
    ...players[targetIndex],
    rack: { tileIds: [...players[targetIndex].rack.tileIds, tileId] },
  };
  return { ...state, tileBag, players };
}

export interface EngineTestGame {
  readonly board: BoardDefinition;
  readonly configuration: GameConfiguration;
  readonly tiles: Record<TileId, Tile>;
  readonly playerOneId: PlayerId;
  readonly playerTwoId: PlayerId;
  readonly state: GameState;
}

/**
 * A full ACTIVE game with a plain 15x15 no-multiplier board and hand-picked rack letters, for
 * engine-action tests (submitMove/confirmProposal/.../pass/exchange) that need precise control
 * over which words can be formed rather than random tiles. A rack letter of `"_"` registers a
 * blank tile instead of a lettered one.
 */
export function buildEngineTestGame(
  options: {
    playerOneRackLetters?: string[];
    bagLetters?: string[];
    rackSize?: RackSize;
  } = {},
): EngineTestGame {
  const board = createBoardDefinition(15, 15, { row: 7, column: 7 }, []);
  const rackSize = options.rackSize ?? 7;
  const configuration = createGameConfiguration(
    "test-config",
    "sv",
    board,
    rackSize,
  );
  const tiles: Record<TileId, Tile> = {};

  const registerLetter = (letter: string): TileId => {
    const id = createTileId();
    tiles[id] = createLetterTile(id, letter, 1);
    return id;
  };

  const registerRackTile = (letter: string): TileId => {
    if (letter === "_") {
      const id = createTileId();
      tiles[id] = createBlankTile(id);
      return id;
    }
    return registerLetter(letter);
  };

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
  const playerOne: Player = {
    ...createPlayer(playerOneId, "August"),
    rack: { tileIds: rackLetters.map(registerRackTile) },
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
  const tileBag: TileBag = createTileBag(bagLetters.map(registerLetter));

  const state: GameState = {
    id: createGameId(),
    version: 1,
    configurationId: configuration.id,
    players: [playerOne, playerTwo],
    board: createBoardState(),
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

export function withTileInRack(
  game: TestGame,
  playerId: PlayerId,
  tileId: TileId,
): TestGame {
  const players = game.state.players.map((player) =>
    player.id === playerId
      ? { ...player, rack: addTileToRack(player.rack, tileId) }
      : player,
  ) as [Player, Player];
  const tileBag: TileBag = {
    tileIds: game.state.tileBag.tileIds.filter((id) => id !== tileId),
  };

  return {
    ...game,
    state: { ...game.state, players, tileBag },
  };
}
