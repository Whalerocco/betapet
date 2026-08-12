import styles from "./ScoreBoard.module.css";

export interface ScoreBoardPlayer {
  readonly name: string;
  readonly score: number;
  readonly isCurrent: boolean;
}

export interface ScoreBoardProps {
  readonly players: readonly ScoreBoardPlayer[];
  readonly tilesRemaining: number;
}

/** Public game information (local-multiplayer.md section 6): scores and bag size are never private. */
export function ScoreBoard({ players, tilesRemaining }: ScoreBoardProps) {
  return (
    <div className={styles.scoreBoard}>
      <div className={styles.players}>
        {players.map((player) => (
          <span
            key={player.name}
            className={
              player.isCurrent
                ? `${styles.player} ${styles.current}`
                : styles.player
            }
          >
            {player.name}: {player.score}
          </span>
        ))}
      </div>
      <span className={styles.bag}>{tilesRemaining} brickor kvar</span>
    </div>
  );
}
