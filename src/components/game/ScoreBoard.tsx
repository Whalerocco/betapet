import styles from "./ScoreBoard.module.css";

export interface ScoreBoardPlayer {
  readonly name: string;
  readonly score: number;
  readonly isCurrent: boolean;
}

export interface ScoreBoardProps {
  readonly players: readonly ScoreBoardPlayer[];
  readonly tilesRemaining: number;
  /** Swedish labels for every gameplay modifier active in this game (game-modifiers.md); empty for the standard rule set. */
  readonly activeModifierLabels?: readonly string[];
  /** Wild mode's currently active validating language (game-modifiers.md section 10); omitted when Wild mode isn't active. */
  readonly activeLanguageLabel?: string;
}

/**
 * Public game information (local-multiplayer.md section 6): scores, bag size, active modifiers,
 * and Wild mode's active language are all public configuration/state, never private to one
 * player — unlike rack contents, none of this needs to stay hidden across a handoff.
 */
export function ScoreBoard({
  players,
  tilesRemaining,
  activeModifierLabels = [],
  activeLanguageLabel,
}: ScoreBoardProps) {
  const hasMetaRow = activeModifierLabels.length > 0 || activeLanguageLabel;
  return (
    <div className={styles.scoreBoard}>
      <div className={styles.mainRow}>
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
      {hasMetaRow && (
        <div className={styles.metaRow}>
          {activeModifierLabels.map((label) => (
            <span key={label} className={styles.badge}>
              {label}
            </span>
          ))}
          {activeLanguageLabel && (
            <span className={styles.badge}>
              Aktivt språk: {activeLanguageLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
