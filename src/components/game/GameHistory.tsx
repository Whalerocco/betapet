import type {
  GameHistory as GameHistoryModel,
  HistoryEvent,
} from "../../game/model/history";
import type { PlayerId } from "../../game/model/ids";
import styles from "./GameHistory.module.css";

export interface GameHistoryProps {
  readonly history: GameHistoryModel;
  readonly playerNames: Readonly<Record<PlayerId, string>>;
  /** Initial state when the caller does not control it (the game-over review). */
  readonly defaultOpen?: boolean;
  /**
   * Let the list flow with the page instead of scrolling inside its own box.
   *
   * The cap belongs to the drawer on a playing screen, which is pinned to the viewport and must
   * not be pushed off it. On the game-over review the page itself scrolls, and there a capped
   * list is worse than useless: it swallows the drag that would have scrolled the page, so the
   * screen reads as unscrollable from wherever the history happens to be (`known-bugs.md`
   * item 18).
   */
  readonly flow?: boolean;
  /**
   * The drawer's state, when a caller controls it. The playing screens do, because whether it is
   * open decides whether the view stays pinned to the viewport (`useHistoryDrawer`).
   */
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
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
        lines.push({
          key: event.id,
          primary: `${nameOf(event.playerId)}: passar`,
        });
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
  flow = false,
  open,
  onOpenChange,
}: GameHistoryProps) {
  const lines = buildHistoryLines(history.events, playerNames);

  return (
    <details
      className={styles.history}
      open={open ?? defaultOpen}
      /*
       * `<details>` is opened and closed by the browser rather than by React, so the state has to
       * be read back out of the element on toggle. A caller that passes `open` is telling this
       * component what to show and wants to be told when the player changes it.
       */
      onToggle={(event) => onOpenChange?.(event.currentTarget.open)}
    >
      <summary className={styles.summary}>Historik</summary>
      {lines.length === 0 ? (
        <p className={styles.empty}>Inga händelser än.</p>
      ) : (
        <ol className={`${styles.list} ${flow ? styles.flowing : ""}`}>
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
