import type {
  GameHistory as GameHistoryModel,
  HistoryEvent,
} from "../../game/model/history";
import type { PlayerId } from "../../game/model/ids";
import styles from "./GameHistory.module.css";

export interface GameHistoryProps {
  readonly history: GameHistoryModel;
  readonly playerNames: Readonly<Record<PlayerId, string>>;
  readonly defaultOpen?: boolean;
}

interface HistoryLine {
  readonly key: string;
  readonly primary: string;
  readonly secondary?: string;
}

/**
 * Turns structured history events into the compact Swedish presentation from ui-design.md
 * section 32. A proposal that is later accepted collapses into a single committed-move line
 * with a "Godkänt av …" note (matching the doc's worked example) instead of three separate
 * lines; a rejected proposal still gets its own line since no commit ever follows it.
 */
function buildHistoryLines(
  events: readonly HistoryEvent[],
  playerNames: Readonly<Record<PlayerId, string>>,
): HistoryLine[] {
  const nameOf = (id: PlayerId) => playerNames[id] ?? "Okänd spelare";
  const lines: HistoryLine[] = [];
  let lastAcceptedBy: PlayerId | undefined;

  for (const event of events) {
    switch (event.type) {
      case "GAME_STARTED":
      case "UNKNOWN_WORD_PROPOSED":
        break;

      case "UNKNOWN_WORD_ACCEPTED":
        lastAcceptedBy = event.playerId;
        break;

      case "WORD_MOVE_COMMITTED": {
        const words = event.payload.words.join(", ");
        const secondary =
          event.payload.usedUnknownWordApproval && lastAcceptedBy
            ? `Godkänt av ${nameOf(lastAcceptedBy)}`
            : undefined;
        lastAcceptedBy = undefined;
        lines.push({
          key: event.id,
          primary: `${nameOf(event.playerId)}: ${words} +${event.payload.scoreAwarded}`,
          secondary,
        });
        break;
      }

      case "UNKNOWN_WORD_REJECTED": {
        const words = event.payload.words.join(", ");
        lines.push({
          key: event.id,
          primary: `${nameOf(event.payload.proposingPlayerId)}: ${words}`,
          secondary: `Nekat av ${nameOf(event.payload.reviewingPlayerId)}`,
        });
        break;
      }

      case "PASS":
        lines.push({ key: event.id, primary: `${nameOf(event.playerId)}: passar` });
        break;

      case "TILES_EXCHANGED":
        lines.push({
          key: event.id,
          primary: `${nameOf(event.playerId)}: byter ${event.payload.tileCount} ${
            event.payload.tileCount === 1 ? "bricka" : "brickor"
          }`,
        });
        break;

      case "GAME_FINISHED":
        lines.push({ key: event.id, primary: "Spelet är slut" });
        break;
    }
  }

  return lines;
}

/**
 * A compact, collapsible history panel (ui-design.md section 32). Uses the native
 * `<details>` disclosure so it is keyboard/screen-reader operable and collapsible on small
 * screens without any extra JS or breakpoint logic.
 */
export function GameHistory({
  history,
  playerNames,
  defaultOpen = true,
}: GameHistoryProps) {
  const lines = buildHistoryLines(history.events, playerNames);

  return (
    <details className={styles.history} open={defaultOpen}>
      <summary className={styles.summary}>Historik</summary>
      {lines.length === 0 ? (
        <p className={styles.empty}>Inga händelser än.</p>
      ) : (
        <ol className={styles.list}>
          {lines.map((line) => (
            <li key={line.key} className={styles.entry}>
              <span className={styles.primary}>{line.primary}</span>
              {line.secondary && (
                <span className={styles.secondary}>{line.secondary}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}
