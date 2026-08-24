import type { BoardDefinition, BoardState } from "../../game/model/board";
import type { GameHistory as GameHistoryModel } from "../../game/model/history";
import type { EndReason, GameResult } from "../../game/model/gameResult";
import type { PlayerId, TileId } from "../../game/model/ids";
import type { Tile } from "../../game/model/tile";
import { Board } from "../board/Board";
import { GameHistory } from "./GameHistory";
import styles from "./GameOverScreen.module.css";

export interface GameOverScreenPlayer {
  readonly id: PlayerId;
  readonly name: string;
}

export interface GameOverScreenProps {
  readonly players: readonly GameOverScreenPlayer[];
  readonly result: GameResult;
  readonly history: GameHistoryModel;
  /** The board as it finished, shown read-only so both players can look over the final position. */
  readonly boardDefinition: BoardDefinition;
  readonly boardState: BoardState;
  readonly tiles: Readonly<Record<TileId, Tile>>;
  readonly onNewGame: () => void;
}

const END_REASON_TEXT: Record<EndReason, string> = {
  NO_TILES_AND_NO_MORE_PLAY:
    "Brickpåsen är tom och en spelare har inga brickor kvar.",
  CONSECUTIVE_PASSES: "Båda spelarna passade i följd.",
  NO_PLAYER_CAN_PLAY: "Ingen spelare kunde göra ett drag.",
  MANUALLY_ENDED: "Spelet avslutades i förtid.",
};

/**
 * The final-result screen (ui-design.md section 39): final scores, winner/tie, remaining-rack
 * deductions, the finished board, and the full move history, followed by a clear new-game action.
 *
 * The board comes after the result rather than before it: the outcome is what players look for
 * first, and the board is what they then talk over. It is the same component the game itself
 * uses, so it pans and pinch-zooms here too — useful for reading a crowded final position on a
 * phone — but nothing on it can be tapped, since there is no move left to make.
 */
export function GameOverScreen({
  players,
  result,
  history,
  boardDefinition,
  boardState,
  tiles,
  onNewGame,
}: GameOverScreenProps) {
  const playerNames = Object.fromEntries(
    players.map((player) => [player.id, player.name]),
  ) as Record<PlayerId, string>;
  const winner =
    result.winnerPlayerIds.length === 1
      ? players.find((player) => player.id === result.winnerPlayerIds[0])
      : undefined;

  return (
    <div className={styles.gameOver}>
      <h1>Spelet är slut</h1>
      <p className={styles.reason}>{END_REASON_TEXT[result.endReason]}</p>

      <table className={styles.scores}>
        <tbody>
          {players.map((player) => (
            <tr
              key={player.id}
              className={
                winner?.id === player.id ? styles.winnerRow : undefined
              }
            >
              <td>{player.name}</td>
              <td className={styles.scoreValue}>
                {result.finalScores[player.id]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className={styles.outcome}>
        {winner ? `${winner.name} vinner!` : "Oavgjort."}
      </p>

      <div className={styles.deductions}>
        <h2>Kvarvarande brickor</h2>
        <ul>
          {players.map((player) => {
            const deduction = result.remainingRackDeductions[player.id];
            return (
              <li key={player.id}>
                {player.name}: {deduction > 0 ? `−${deduction}` : "0"}
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.finalBoard}>
        <h2>Slutställning</h2>
        <Board
          boardDefinition={boardDefinition}
          boardState={boardState}
          tiles={tiles}
          pendingPlacedTiles={[]}
          canPlaceSelectedTile={false}
          onPlaceAt={() => {}}
          onPendingTileClick={() => {}}
        />
      </div>

      <GameHistory history={history} playerNames={playerNames} />

      <button type="button" className={styles.primary} onClick={onNewGame}>
        Nytt spel
      </button>
    </div>
  );
}
