import type { GameHistory as GameHistoryModel } from "../../game/model/history";
import type { EndReason, GameResult } from "../../game/model/gameResult";
import type { PlayerId } from "../../game/model/ids";
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
 * deductions, and the full move history, followed by a clear new-game action.
 */
export function GameOverScreen({
  players,
  result,
  history,
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

      <GameHistory history={history} playerNames={playerNames} />

      <button type="button" className={styles.primary} onClick={onNewGame}>
        Nytt spel
      </button>
    </div>
  );
}
