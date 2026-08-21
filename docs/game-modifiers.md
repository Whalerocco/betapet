# Game Modifiers

## 1. Purpose

This document specifies **game modifiers**: optional rule changes a game's players select before starting a local game, on top of the standard Swedish Alfapet rules in `game-rules.md`.

It started as a forward-looking specification, in the same sense as `online-multiplayer.md`, so that implementation could begin directly from an agreed design instead of inventing modifier behaviour ad hoc when the corresponding roadmap milestone is reached. Crisscross, Replace, and Illegal mode (Milestone 4.5) are now implemented; Polyglot and Wild mode (the scoped-down Milestone 8 + Milestone 8.1, per DEC-010) are specified and decided but not yet implemented.

Where this document leaves a question open, it says so explicitly (see section 11). Do not silently resolve those questions during implementation; follow `CLAUDE.md`'s instruction to stop and ask the project owner instead.

---

## 2. Relationship to other documents

```text
game-rules.md        — the standard rule set (authoritative; modifiers are exceptions to it)
content-model.md      — GameConfiguration.modifiers carries the selection described here
roadmap.md            — milestones that introduce these modifiers
tasks.md              — concrete implementation tasks for those milestones
decisions.md          — records the outcome once an open question (section 11) is resolved
```

A modifier never silently changes `game-rules.md`. Every modifier is described here as an explicit, opt-in deviation from a specific numbered section of `game-rules.md`. If no modifier is selected, gameplay is exactly what `game-rules.md` describes today.

---

## 3. What a modifier is

Conceptually:

```text
Modifier
├── id
├── name
├── description
├── ruleChanges        — which game-rules.md sections it overrides or extends
└── settings?           — modifier-specific configuration, e.g. a selected language list
```

A modifier is selected per game, at game setup, alongside rack size and other `GameConfiguration` choices. It cannot be changed mid-game.

Two categories of settings exist, and must not be conflated:

- **Gameplay modifiers** (this document) change game rules. They are part of `GameConfiguration`, are visible to both players, must be identical for both players in a game, and must be enforced by the engine — never assumed or re-implemented in the UI (`architecture.md` section 24).
- **UI/device preferences** (for example a visual theme, or an animation/reduced-motion preference) do not change game rules. If added later, they belong to a local, per-device settings concern outside `GameConfiguration` and outside `GameState`, analogous to `LocalSessionState` (`content-model.md` section 38). They are out of scope for this document and are not designed here; this document only reserves the distinction so the two are never merged into one "settings" bucket.

---

## 4. The five modifiers

```text
CRISSCROSS   — place a connected multi-branch cluster of new tiles in one move
REPLACE      — place a tile on top of an already-played tile
ILLEGAL      — only non-dictionary words may be played
POLYGLOT     — a word is valid if it exists in any of several selected languages
WILD         — the active validating language rotates every full round
```

`POLYGLOT` and `WILD` require more than one language/dictionary to be configured to have any effect, so they depend on the multi-language groundwork in roadmap Milestone 8 (`roadmap.md`). `CRISSCROSS`, `REPLACE`, and `ILLEGAL` only need the existing Swedish configuration and do not have that dependency.

---

## 5. Modifier compatibility

Modifiers are not all safe to combine. The project needs a single source of truth for which combinations are allowed, checked by the engine at game-configuration time — not just by graying out checkboxes in the UI, per the same client/engine separation `architecture.md` already requires for move legality.

Conceptually:

```text
MODIFIER_COMPATIBILITY: Map<[ModifierId, ModifierId], CompatibilityStatus>

CompatibilityStatus =
  | COMPATIBLE
  | COMPATIBLE_WITH_INTERACTION   — allowed, but section 11 of this document defines how they interact
  | UNDECIDED                     — not offered together in the UI, and rejected by the engine, until a decision is recorded in decisions.md
```

A `validateModifierSelection(selected: ModifierId[])` function (or equivalent) should be the single place this is checked, called both by the settings UI (to disable incompatible combinations before the player can pick them) and by the engine when a game is actually created (so a game can never start in an invalid configuration regardless of what the UI allowed through).

### Current matrix

| | CRISSCROSS | REPLACE | ILLEGAL | POLYGLOT | WILD |
|---|---|---|---|---|---|
| **CRISSCROSS** | — | COMPATIBLE_WITH_INTERACTION | COMPATIBLE | COMPATIBLE | COMPATIBLE |
| **REPLACE** | COMPATIBLE_WITH_INTERACTION | — | COMPATIBLE | COMPATIBLE | COMPATIBLE |
| **ILLEGAL** | COMPATIBLE | COMPATIBLE | — | COMPATIBLE_WITH_INTERACTION | COMPATIBLE_WITH_INTERACTION |
| **POLYGLOT** | COMPATIBLE | COMPATIBLE | COMPATIBLE_WITH_INTERACTION | — | UNDECIDED |
| **WILD** | COMPATIBLE | COMPATIBLE | COMPATIBLE_WITH_INTERACTION | UNDECIDED | — |

Notes:

- **CRISSCROSS + REPLACE** — both change physical placement validation; a single move could place a multi-branch cluster where one branch covers an existing tile. Allowed, but the physical-validation and word-detection logic must be designed together for this case, not bolted on separately (see sections 6 and 7).
- **ILLEGAL + POLYGLOT** — a word must fail dictionary lookup in *every* selected language to count as playable under Illegal mode, not just one (section 11).
- **ILLEGAL + WILD** — a word must fail dictionary lookup in whichever language is currently active for that round (section 11).
- **POLYGLOT + WILD** — these two encode opposite mental models for "which language(s) currently apply": Polyglot means several languages are simultaneously valid; Wild means exactly one language is active at a time, rotating. Combining them is conceivable (e.g. a rotating *subset* of languages) but is not designed here. Per DEC-010 they stay mutually exclusive (`UNDECIDED`) for now; revisit only if a future decision defines a combined behaviour (see section 11).

This table must be updated whenever a new modifier is added or an `UNDECIDED` entry is resolved.

---

## 6. Crisscross mode

### Summary

In one move, a player may place a connected cluster of new tiles spanning more than one line — for example a T- or plus-shape — rather than being limited to a single straight line of new tiles.

### Rule change

This overrides `game-rules.md` section 8: "All tiles placed during one normal word move must form a single connected line, unless a special Alfapet tile/rule explicitly permits otherwise." Crisscross mode is exactly such an explicitly-permitted exception.

Under Crisscross mode, a move's new tiles are legal if (DEC-014):

- Every newly placed tile belongs to a 2+ letter line — a contiguous row or column run of tiles, existing and/or newly placed, with no gaps, exactly as section 7 already requires of any single word.
- Those lines connect to each other by sharing a cell — e.g. a T or plus shape, where one line crosses another at a shared tile (new or existing). No newly placed tile may be part of a line that never shares a cell with any other line the move forms — that would be a disconnected island, even if it separately touches some unrelated part of the existing board.
- Section 6 (first move must cover the centre square) and section 7 (subsequent moves must connect to the existing board) still apply to the cluster as a whole, not to each branch individually — i.e. at least one tile in the cluster must satisfy them, not every branch.
- No diagonal placement, matching section 7.

Two lines that only reach each other by detouring through an unrelated part of the existing board — rather than directly sharing a cell — do **not** count as connected, even though each independently touches the board somewhere (DEC-014).

### Word detection and scoring

`game-rules.md` section 9 already requires that "every word created by the move must be considered," and the engine's word-detection is expected to derive words from board state rather than trust a client-supplied word (Milestone 1.5). Crisscross mode does not change that principle — it only means a move's cluster can contain more than one line of *entirely new* tiles (today, at most one line of new tiles can exist per move; every other newly formed word is a single-new-tile crossing word). Word detection must therefore be verified to correctly derive and score every resulting word — including two or more lines composed entirely of newly placed tiles — not just the "one main line plus single-letter crossings" shape it currently needs to handle. Whether this needs new logic or the existing per-tile line-scanning approach already generalizes correctly must be confirmed against the actual implementation in `src/game/engine` before this milestone is scoped as small.

Scoring itself follows the standard rules unchanged: every newly covered square's multiplier applies once, per section 22/23; the all-tiles bonus is unaffected.

---

## 7. Replace mode

### Summary

A player may place a new tile on a board cell that already holds a committed tile, instead of only on an empty cell. The displaced tile returns to the *replacing* player's rack (DEC-008) — a player may take a tile the opponent had on the board.

### Rule change

This overrides the implicit assumption throughout `game-rules.md` sections 7–8 that a move only ever places tiles on empty cells, and modifies section 28 ("tiles cannot normally be moved after a completed turn") for this specific case.

- A move may include one or more "replace placements": a new tile placed on a cell that currently holds a previously committed tile.
- When a replace placement is committed, the tile it displaced is removed from the board and added to the *replacing* player's rack (DEC-008) — not returned to whichever player originally played it.
- If the displaced tile is a blank, it resets to a reusable blank: its previous represented-letter assignment is discarded, and it can be assigned a different letter the next time it's played, the same as a blank that was never committed (DEC-008).
- A displaced tile is temporarily restricted: for the remainder of the turn in which it was displaced, if the same player plays it again that turn, it may only be placed on an empty cell (it cannot itself be used to displace another tile in the same turn — no replace-chaining within one move). Once at least one full turn has passed with the tile still in the player's rack, this restriction lifts and the tile becomes usable exactly like any other rack tile, including for another replace placement.
- A replace placement must change the letter on the cell (DEC-015): a tile may not be placed on top of a tile showing the same letter. A blank counts as the letter it represents on both sides of that comparison — a blank chosen to represent "R" may not replace an "R", and a plain "R" may not replace a committed blank already representing "R". Replacing a letter with a *different* letter is unaffected, including replacing a blank with a real tile or vice versa.
- A replace placement may only target a *committed* board tile. It cannot target a tile that is part of the current player's own not-yet-committed pending move (use the normal move/remove-pending-tile actions for that instead).
- A word scores only if this move lengthened it or created it (DEC-016). A word the move merely re-lettered — same cells, same length, one letter different — awards nothing. This applies in both directions symmetrically: replacing the "I" in a committed "BIL" that is also crossed vertically by "SIL" yields "BAL" and "SAL", and neither scores. Lengthening the word restores the whole word's normal score, the replaced tile included: extending that same "BAL" into "BALA" scores all four letters. A zero-scoring word is still a word for every other purpose — it must be a dictionary word or be accepted by the opponent, exactly like any other word the move forms.
- The all-tiles bonus is unaffected by the rule above: it is awarded for emptying the rack (section 25), so a rack-emptying move earns it even if every word it touched scored nothing.
- Multiplier squares are unaffected by a replace: per section 22/23, a square's multiplier only applies the first time it is covered, and a replaced cell was already covered before. So within a word that does score, a replace placement contributes only the newly placed tile's plain letter value (times any surviving word multiplier for the word, as usual — the cell's own letter/word multiplier does not reactivate).
- Drawing after the move follows `game-rules.md` section 12 unchanged — the rack is refilled *up to* the configured rack size, not by the number of tiles placed. Because a displaced tile has already returned to the same rack, the two are not equivalent under this modifier: a replace effectively costs one fewer drawn tile, and the rack never grows past its configured size.
- The words affected by a replace are re-derived exactly like any other move: the horizontal and vertical runs through the replaced cell are "words affected by this move" per section 9, and go through the normal validation/scoring/dictionary pipeline (including the disputed-word flow if the resulting word is unknown). Earlier, already-committed moves keep the score they were already awarded; replacing a tile does not retroactively change history.

---

## 8. Illegal mode

### Summary

Only words that are *not* recognized as standard dictionary words may be played. Every move still goes through the normal opponent-approval flow (`game-rules.md` sections 15–19) — Illegal mode does not skip approval, it makes approval mandatory for every move instead of only for unknown words.

### Rule change

This overrides `game-rules.md` section 11 (standard dictionary validity) for the purpose of what may be *submitted*, without changing section 15–19's approval mechanic itself:

- A move may not be submitted at all if *any* word it forms classifies as `DICTIONARY_WORD` (DEC-008) — not only when every word does. This is stricter than today's ordinary multi-word approval unit, which only needs one non-dictionary word to enter the proposal flow; under Illegal mode, every formed word must be non-dictionary.
- `ACCEPTED_IN_GAME` words remain playable (DEC-008): Illegal mode only blocks `DICTIONARY_WORD`, treating previously-accepted words as their own category rather than folding them back into "dictionary word" once accepted.
- Every submittable move's formed words go through the proposal/approval flow described in section 15–19, exactly as an ordinary unknown word does today.
- `FORBIDDEN_WORD` (currently: one-letter words only, per `decisions.md` DEC-007) is unaffected — those remain hard-blocked in Illegal mode too.

---

## 9. Polyglot mode

### Summary

A game is configured with two or more languages. A formed word is treated as a standard dictionary word if it is found in *any* of the selected languages' dictionaries.

### Rule change

This overrides `game-rules.md` section 11 by evaluating dictionary membership against a set of languages instead of a single fixed one. `dictionary.md`'s classification (`DICTIONARY_WORD` / `ACCEPTED_IN_GAME` / `UNKNOWN_WORD` / `FORBIDDEN_WORD`) is otherwise unchanged; it is simply evaluated once per selected language, and the result is `DICTIONARY_WORD` if any one of them matches.

The board, tile set, and rack letters are not affected — the same single physical tile set/board configured for the game is used throughout (consistent with Wild mode's "dictionary only" scope in section 10). A word using letters outside a given language's alphabet simply cannot match that language's dictionary; it can still match another selected language, or fall through to the normal unknown-word flow.

### Dependency

Only meaningful once more than one `LanguageDefinition` and dictionary exist (`content-model.md` section 9) — the scoped-down, dictionary-only slice of Milestone 8 that DEC-010 pulled ahead of Milestone 5 (see section 12). With only Swedish configured, Polyglot mode is a no-op equivalent to the standard rules.

---

## 10. Wild mode

### Summary

The game is configured with an ordered list of two or more languages. After every full round (both players have completed one turn since the last rotation), the *active* language for dictionary validation advances to the next language in the list, cycling back to the start after the last one.

### Rule change

This overrides `game-rules.md` section 11 by making "the dictionary" a value that changes over the course of the game rather than a fixed configuration. A move is validated against whichever language is active at the moment that move is committed.

As decided for this project (rather than a full tile-set swap): the board and physical tile set do not change when the active language rotates — only which dictionary is used to classify newly formed words changes. A word using letters absent from the newly active language's alphabet will simply tend to miss that language's dictionary and fall through to the unknown-word flow, exactly like any other unrecognized word.

### Dependency

Same as Polyglot mode (section 9) — requires the scoped-down Milestone 8 multi-language groundwork to be meaningful.

### Accepted vocabulary

Resolved by DEC-012 (superseding DEC-010's original answer): a word accepted by the opponent while
one language is active becomes valid again only when that same language is active — not
automatically valid under every other configured Wild language. Accepted vocabulary entries carry
an optional language tag for this purpose; see section 11 and `content-model.md` section 28.

---

## 11. Open questions requiring a project-owner decision

Do not resolve these silently during implementation. Each should become a `decisions.md` entry once answered, and this document updated to match.

Resolved by DEC-008 (all four questions that were blocking Milestone 4.5):

- ~~Replace mode — which rack receives the displaced tile.~~ The replacing player's own rack.
- ~~Replace mode — displaced blank tiles.~~ Reset to a reusable blank.
- ~~Illegal mode — `ACCEPTED_IN_GAME` words.~~ Remain playable; only `DICTIONARY_WORD` is blocked.
- ~~Illegal mode — partially-dictionary-valid multi-word moves.~~ Blocked if *any* formed word is a dictionary word.

Resolved by DEC-010 (all three questions that were blocking Milestone 8.1):

- ~~Illegal + Polyglot interaction detail.~~ A word must be illegal (non-dictionary) in *every* selected language to be playable.
- ~~Wild mode — accepted-vocabulary scope.~~ Resolved by DEC-010, then superseded by DEC-012: a word accepted while one language was active is valid again only when that same language is active later — scoped per language, not one flat set (`content-model.md` section 28).
- ~~Polyglot + Wild combination.~~ Stay `UNDECIDED`/mutually exclusive for now; not designed in this round.

---

## 12. Roadmap and task placement

Per the project owner's direction:

- Crisscross, Replace, and Illegal mode belong to a milestone positioned after Version 1 and after real playtesting (roadmap Milestone 4.4), since they only require the existing Swedish configuration.
- Polyglot and Wild mode need at least one additional configured language/dictionary to be anything but a no-op. Per DEC-010, the project owner chose to pull a **scoped-down** version of Milestone 8 — `LanguageDefinition`/dictionary support only for German, French, English, and Spanish, explicitly *not* new per-language tile sets, boards, or UI translations — forward ahead of Milestone 5 (online), specifically to unlock these two modifiers. Full Milestone 8 (per-language tile sets/boards/UI translation) remains future work in its original roadmap position.

See `roadmap.md` for the corresponding milestones and `tasks.md` for their task breakdowns.
