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

/**
 * The way off this screen, which differs between the two games — and is why this is a union
 * rather than a bag of optional callbacks. A finished match had exactly one action, `Nytt spel`,
 * which online led back to the match list rather than to a new game: the only way out, and the
 * wrong one (`known-bugs.md` item 19). Every variant here has to name a way back, so a screen
 * with no exit cannot be built again.
 */
export type GameOverActions =
  /** Hot-seat: the game was started here, and a new one starts here too. */
  | { readonly kind: "LOCAL"; readonly onNewGame: () => void }
  /**
   * Online: `Revansch` opens match creation against the same opponent (the rules are still the
   * inviter's to confirm, DEC-029), and `Tillbaka` returns to the match list. A rematch needs an
   * opponent the server can be given — a handle (DEC-036) — so it is offered only when the match
   * carried one.
   */
  | {
      readonly kind: "ONLINE";
      readonly onRematch?: () => void;
      readonly onBack: () => void;
    };

export interface GameOverScreenProps {
  readonly players: readonly GameOverScreenPlayer[];
  readonly result: GameResult;
  readonly history: GameHistoryModel;
  /** The board as it finished, shown read-only so both players can look over the final position. */
  readonly boardDefinition: BoardDefinition;
  readonly boardState: BoardState;
  readonly tiles: Readonly<Record<TileId, Tile>>;
  readonly actions: GameOverActions;
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
 * deductions, the finished board, and the full move history, followed by the ways off the screen
 * (`actions`, which differ between the hot-seat game and an online match).
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
  actions,
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

      {/* Flowing rather than scrolling inside its own box: this page scrolls, and a list with
          its own scroller swallows the drag that would have scrolled the page
          (`known-bugs.md` item 18). */}
      <GameHistory history={history} playerNames={playerNames} flow />

      <div className={styles.actions}>
        {actions.kind === "LOCAL" ? (
          <button
            type="button"
            className={styles.primary}
            onClick={actions.onNewGame}
          >
            Nytt spel
          </button>
        ) : (
          <>
            {actions.onRematch && (
              <button
                type="button"
                className={styles.primary}
                onClick={actions.onRematch}
              >
                Revansch
              </button>
            )}
            <button
              type="button"
              className={styles.secondary}
              onClick={actions.onBack}
            >
              Tillbaka
            </button>
          </>
        )}
      </div>
    </div>
  );
}
