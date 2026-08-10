import { SWEDISH_SCRABBLE_TILE_DEFINITIONS } from "../../data/tiles/swedishScrabbleTiles";
import { createSwedishGameConfiguration } from "../configuration/swedishConfiguration";
import { createBoardState } from "../model/board";
import { createGameState, type GameState } from "../model/game";
import type { RackSize } from "../model/gameConfiguration";
import { addHistoryEvent, createGameHistory } from "../model/history";
import {
  createGameId,
  createHistoryEventId,
  createPlayerId,
  type PlayerId,
} from "../model/ids";
import { createPlayer, type Player } from "../model/player";
import type { Tile } from "../model/tile";
import type { TileId } from "../model/ids";
import {
  createTileBag,
  drawTiles,
  shuffleTileBag,
  type RandomSource,
  type TileBag,
} from "../model/tileBag";
import { playerTurn } from "../model/turnState";
import { createTileInstances } from "./createTileInstances";

export interface CreateGameOptions {
  readonly playerOneName: string;
  readonly playerTwoName: string;
  readonly rackSize: RackSize;
  /** Injectable for deterministic tests; defaults to `Math.random` for normal play. */
  readonly randomSource?: RandomSource;
}

/**
 * Determines who starts by drawing one tile each and comparing point values (game-rules.md
 * section 2). The rules don't specify a tie-break, so on a tie both tiles are returned to the
 * bag and the draw is repeated — the standard convention for this kind of procedure.
 */
export function determineStartingPlayer(
  bag: TileBag,
  tiles: Readonly<Record<TileId, Tile>>,
  playerOneId: PlayerId,
  playerTwoId: PlayerId,
): { bag: TileBag; startingPlayerId: PlayerId } {
  let currentBag = bag;

  for (;;) {
    const { bag: remaining, drawn } = drawTiles(currentBag, 2);
    const [tileIdA, tileIdB] = drawn;
    const pointsA = tiles[tileIdA].points;
    const pointsB = tiles[tileIdB].points;
    const bagWithTilesReturned: TileBag = {
      tileIds: [...remaining.tileIds, tileIdA, tileIdB],
    };

    if (pointsA !== pointsB) {
      return {
        bag: bagWithTilesReturned,
        startingPlayerId: pointsA > pointsB ? playerOneId : playerTwoId,
      };
    }
    currentBag = bagWithTilesReturned;
  }
}

export function createGame(options: CreateGameOptions): GameState {
  const randomSource = options.randomSource ?? Math.random;
  const configuration = createSwedishGameConfiguration(options.rackSize);

  const playerOneId = createPlayerId();
  const playerTwoId = createPlayerId();

  const { tiles, tileIds } = createTileInstances(
    SWEDISH_SCRABBLE_TILE_DEFINITIONS,
  );
  const shuffledBag = shuffleTileBag(createTileBag(tileIds), randomSource);

  const { bag: bagAfterDetermination, startingPlayerId } =
    determineStartingPlayer(shuffledBag, tiles, playerOneId, playerTwoId);

  const drawForPlayerOne = drawTiles(bagAfterDetermination, options.rackSize);
  const drawForPlayerTwo = drawTiles(drawForPlayerOne.bag, options.rackSize);

  const playerOne: Player = {
    ...createPlayer(playerOneId, options.playerOneName),
    rack: { tileIds: drawForPlayerOne.drawn },
  };
  const playerTwo: Player = {
    ...createPlayer(playerTwoId, options.playerTwoName),
    rack: { tileIds: drawForPlayerTwo.drawn },
  };

  const history = addHistoryEvent(createGameHistory(), {
    id: createHistoryEventId(),
    sequence: 0,
    type: "GAME_STARTED",
    payload: {},
  });

  return createGameState({
    id: createGameId(),
    version: 1,
    configurationId: configuration.id,
    players: [playerOne, playerTwo],
    board: createBoardState(),
    tileBag: drawForPlayerTwo.bag,
    tiles,
    currentPlayerId: startingPlayerId,
    turnState: playerTurn(startingPlayerId),
    acceptedVocabulary: [],
    history,
    consecutivePasses: 0,
    status: "ACTIVE",
  });
}
