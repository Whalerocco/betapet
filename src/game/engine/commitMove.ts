import { placeCommittedTile } from "../model/board";
import type { FormedWord } from "../model/formedWord";
import { createGameState, type GameState } from "../model/game";
import { addHistoryEvent, nextSequence } from "../model/history";
import { createHistoryEventId, type PlayerId } from "../model/ids";
import type { PendingPlacedTile } from "../model/pendingMove";
import type { Player } from "../model/player";
import type { ScoreResult } from "../model/scoreResult";
import { drawTiles } from "../model/tileBag";
import { finishedTurnState, playerTurn } from "../model/turnState";
import { checkGameEnd } from "./gameEndCheck";

export interface CommitMoveParams {
  readonly playerId: PlayerId;
  readonly placedTiles: readonly PendingPlacedTile[];
  readonly formedWords: readonly FormedWord[];
  readonly scoreResult: ScoreResult;
  /** Newly-accepted unknown words this move adds to the game's vocabulary; empty for a normal move. */
  readonly acceptedWords: readonly string[];
  readonly usedUnknownWordApproval: boolean;
}

/**
 * Atomically commits an already-validated move (normal-move-example.md section 18,
 * disputed-word-example.md section 23): moves pending tiles onto the committed board, finalizes
 * any blank's represented letter permanently, applies the score, draws replacements, records
 * accepted vocabulary and history, then either advances to the other player or ends the game.
 * Callers are responsible for everything before this point (preconditions, physical/word
 * validation, scoring) — this function does not re-validate.
 */
export function commitMove(
  state: GameState,
  params: CommitMoveParams,
): GameState {
  let board = state.board;
  let tiles = state.tiles;
  for (const placed of params.placedTiles) {
    board = placeCommittedTile(board, placed.coordinate, placed.tileId);
    if (placed.representedLetter) {
      const tile = tiles[placed.tileId];
      if (tile.kind === "BLANK") {
        tiles = {
          ...tiles,
          [placed.tileId]: {
            ...tile,
            representedLetter: placed.representedLetter,
          },
        };
      }
    }
  }

  const player = state.players.find((p) => p.id === params.playerId)!;
  const draw = drawTiles(state.tileBag, params.placedTiles.length);
  const updatedPlayer: Player = {
    ...player,
    score: player.score + params.scoreResult.total,
    rack: { tileIds: [...player.rack.tileIds, ...draw.drawn] },
  };
  const players = state.players.map((p) =>
    p.id === params.playerId ? updatedPlayer : p,
  ) as [Player, Player];

  let acceptedVocabulary = state.acceptedVocabulary;
  for (const word of params.acceptedWords) {
    if (!acceptedVocabulary.includes(word)) {
      acceptedVocabulary = [...acceptedVocabulary, word];
    }
  }

  const history = addHistoryEvent(state.history, {
    id: createHistoryEventId(),
    sequence: nextSequence(state.history),
    type: "WORD_MOVE_COMMITTED",
    playerId: params.playerId,
    payload: {
      placedTiles: params.placedTiles,
      words: params.formedWords.map((w) => w.text),
      scoreAwarded: params.scoreResult.total,
      usedUnknownWordApproval: params.usedUnknownWordApproval,
    },
  });

  const otherPlayer = players.find((p) => p.id !== params.playerId)!;

  const activeState: GameState = {
    ...state,
    status: "ACTIVE",
    board,
    tiles,
    tileBag: draw.bag,
    players,
    acceptedVocabulary,
    history,
    pendingMove: undefined,
    consecutivePasses: 0,
    currentPlayerId: otherPlayer.id,
    turnState: playerTurn(otherPlayer.id),
  };

  const endCheck = checkGameEnd(activeState);
  if (endCheck.ended) {
    const finishedHistory = addHistoryEvent(activeState.history, {
      id: createHistoryEventId(),
      sequence: nextSequence(activeState.history),
      type: "GAME_FINISHED",
      payload: { result: endCheck.result },
    });
    return createGameState({
      ...activeState,
      status: "FINISHED",
      turnState: finishedTurnState(),
      result: endCheck.result,
      history: finishedHistory,
    });
  }

  return createGameState(activeState);
}
