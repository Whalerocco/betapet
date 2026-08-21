import { placeCommittedTile } from "../model/board";
import type { FormedWord } from "../model/formedWord";
import type { GameState } from "../model/game";
import { addHistoryEvent, nextSequence } from "../model/history";
import { createHistoryEventId, type PlayerId } from "../model/ids";
import type { LanguageCode } from "../model/language";
import type { PendingPlacedTile } from "../model/pendingMove";
import type { Player } from "../model/player";
import type { ScoreResult } from "../model/scoreResult";
import { drawTiles } from "../model/tileBag";
import { playerTurn } from "../model/turnState";
import { finalizeTurn } from "./finalizeTurn";

export interface CommitMoveParams {
  readonly playerId: PlayerId;
  readonly placedTiles: readonly PendingPlacedTile[];
  readonly formedWords: readonly FormedWord[];
  readonly scoreResult: ScoreResult;
  /** Newly-accepted unknown words this move adds to the game's vocabulary; empty for a normal move. */
  readonly acceptedWords: readonly string[];
  /**
   * The Wild-mode language active when `acceptedWords` were accepted (DEC-012); omitted outside
   * Wild mode, in which case accepted words remain language-agnostic as before.
   */
  readonly acceptedWordsLanguage?: LanguageCode;
  readonly usedUnknownWordApproval: boolean;
  /**
   * The game's configured rack size, so the player's rack is refilled *up to* it (game-rules.md
   * section 12) rather than by the number of tiles placed. The two only differ under Replace mode
   * (game-modifiers.md section 7), where a displaced tile has already returned to the same rack —
   * drawing one per placed tile there would grow the rack past its size every replace.
   */
  readonly rackSize: number;
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
  // The rack already reflects this move: placed tiles left it when they were placed, and any
  // Replace-mode displaced tiles arrived in it at the same moment. Refilling to the configured
  // size (game-rules.md section 12) is therefore the whole rule — never "one per tile placed".
  const missingTiles = Math.max(
    0,
    params.rackSize - player.rack.tileIds.length,
  );
  const draw = drawTiles(state.tileBag, missingTiles);
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
    const alreadyAccepted = acceptedVocabulary.some(
      (entry) =>
        entry.word === word && entry.languageCode === params.acceptedWordsLanguage,
    );
    if (!alreadyAccepted) {
      acceptedVocabulary = [
        ...acceptedVocabulary,
        { word, languageCode: params.acceptedWordsLanguage },
      ];
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

  return finalizeTurn(activeState);
}
