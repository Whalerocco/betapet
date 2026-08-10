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
import { createLetterTile, type Tile } from "../model/tile";
import { createTileBag, type TileBag } from "../model/tileBag";
import { createGameHistory } from "../model/history";
import { playerTurn } from "../model/turnState";
import type { GameState } from "../model/game";

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
