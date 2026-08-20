import type { GameHistory } from "../model/history";

/**
 * Whether any move has ever committed in this game (physicalValidation.ts's
 * `isFirstMoveOverride` doc): Replace mode can momentarily reduce the board to zero occupied
 * cells mid-edit, which would otherwise make a genuinely later move look like the first one, so
 * "first move" must be derived from history rather than from the board's current tile count.
 */
export function hasCommittedMove(history: GameHistory): boolean {
  return history.events.some((event) => event.type === "WORD_MOVE_COMMITTED");
}

/**
 * Wild mode (game-modifiers.md section 10): after every full round — both players have
 * completed one turn since the last rotation — the active validating language advances to the
 * next language in the configured ordered list, cycling back to the start after the last one.
 *
 * A "completed turn" is a `WORD_MOVE_COMMITTED`, `PASS`, or `TILES_EXCHANGED` history event —
 * the three ways a turn actually ends and hands control to the other player. This deliberately
 * excludes `UNKNOWN_WORD_PROPOSED`/`UNKNOWN_WORD_REJECTED`: a rejected proposal returns control
 * to the same proposing player without completing a turn (game-rules.md sections 15-19), so it
 * must not advance the round count. `UNKNOWN_WORD_ACCEPTED` is always immediately followed by
 * its own `WORD_MOVE_COMMITTED` (acceptProposedMove.ts), so counting only the latter avoids
 * double-counting one turn as two.
 *
 * Called with `state.history` as it stands *before* the current move is added — i.e. every turn
 * completed strictly before this one. Since a move's word classification is computed once, at
 * submission time, and nothing can complete another turn while that move sits in
 * REQUIRES_PLAYER_CONFIRMATION/WAITING_FOR_OPPONENT_APPROVAL (the proposing/reviewing player is
 * the only one who can act), this is equivalent to "the language active when the move commits"
 * for every real call site, including the disputed-word flow.
 */
export function activeWildLanguageIndex(
  history: GameHistory,
  languageCount: number,
): number {
  const completedTurns = history.events.filter(
    (event) =>
      event.type === "WORD_MOVE_COMMITTED" ||
      event.type === "PASS" ||
      event.type === "TILES_EXCHANGED",
  ).length;
  const completedFullRounds = Math.floor(completedTurns / 2);
  return completedFullRounds % languageCount;
}
