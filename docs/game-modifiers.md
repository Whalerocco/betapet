# Game Modifiers

## 1. Purpose

This document specifies **game modifiers**: optional rule changes a game's players select before starting a local game, on top of the standard Swedish Alfapet rules in `game-rules.md`.

It is a forward-looking specification, in the same sense as `online-multiplayer.md`. Nothing in this document is implemented yet. It exists so that implementation can begin directly from an agreed design instead of inventing modifier behaviour ad hoc when the corresponding roadmap milestone is reached.

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
- **POLYGLOT + WILD** — these two encode opposite mental models for "which language(s) currently apply": Polyglot means several languages are simultaneously valid; Wild means exactly one language is active at a time, rotating. Combining them is conceivable (e.g. a rotating *subset* of languages) but is not designed here. They default to mutually exclusive (`UNDECIDED`) until the project owner decides whether/how they combine (see section 11).

This table must be updated whenever a new modifier is added or an `UNDECIDED` entry is resolved.

---

## 6. Crisscross mode

### Summary

In one move, a player may place a connected cluster of new tiles spanning more than one line — for example a T- or plus-shape — rather than being limited to a single straight line of new tiles.

### Rule change

This overrides `game-rules.md` section 8: "All tiles placed during one normal word move must form a single connected line, unless a special Alfapet tile/rule explicitly permits otherwise." Crisscross mode is exactly such an explicitly-permitted exception.

Under Crisscross mode, a move's new tiles are legal if:

- Every newly placed tile is connected — directly or transitively through other newly placed tiles or existing board tiles — into one single cluster. No newly placed tile may be a disconnected island.
- Within that cluster, each straight run of tiles (existing and/or newly placed) still forms a contiguous line with no gaps, exactly as section 7 already requires of any single word.
- Section 6 (first move must cover the centre square) and section 7 (subsequent moves must connect to the existing board) still apply to the cluster as a whole, not to each branch individually — i.e. at least one tile in the cluster must satisfy them, not every branch.
- No diagonal placement, matching section 7.

### Word detection and scoring

`game-rules.md` section 9 already requires that "every word created by the move must be considered," and the engine's word-detection is expected to derive words from board state rather than trust a client-supplied word (Milestone 1.5). Crisscross mode does not change that principle — it only means a move's cluster can contain more than one line of *entirely new* tiles (today, at most one line of new tiles can exist per move; every other newly formed word is a single-new-tile crossing word). Word detection must therefore be verified to correctly derive and score every resulting word — including two or more lines composed entirely of newly placed tiles — not just the "one main line plus single-letter crossings" shape it currently needs to handle. Whether this needs new logic or the existing per-tile line-scanning approach already generalizes correctly must be confirmed against the actual implementation in `src/game/engine` before this milestone is scoped as small.

Scoring itself follows the standard rules unchanged: every newly covered square's multiplier applies once, per section 22/23; the all-tiles bonus is unaffected.

---

## 7. Replace mode

### Summary

A player may place a new tile on a board cell that already holds a committed tile, instead of only on an empty cell. The displaced tile returns to the current player's rack.

### Rule change

This overrides the implicit assumption throughout `game-rules.md` sections 7–8 that a move only ever places tiles on empty cells, and modifies section 28 ("tiles cannot normally be moved after a completed turn") for this specific case.

- A move may include one or more "replace placements": a new tile placed on a cell that currently holds a previously committed tile.
- When a replace placement is committed, the tile it displaced is removed from the board and added to the current player's rack.
- A displaced tile is temporarily restricted: for the remainder of the turn in which it was displaced, if the same player plays it again that turn, it may only be placed on an empty cell (it cannot itself be used to displace another tile in the same turn — no replace-chaining within one move). Once at least one full turn has passed with the tile still in the player's rack, this restriction lifts and the tile becomes usable exactly like any other rack tile, including for another replace placement.
- A replace placement may only target a *committed* board tile. It cannot target a tile that is part of the current player's own not-yet-committed pending move (use the normal move/remove-pending-tile actions for that instead).
- Multiplier squares are unaffected by a replace: per section 22/23, a square's multiplier only applies the first time it is covered, and a replaced cell was already covered before. A replace placement scores only the newly placed tile's letter value at that position (times any surviving word multiplier for the word, as usual — the cell's own letter/word multiplier does not reactivate).
- The words affected by a replace are re-derived exactly like any other move: the horizontal and vertical runs through the replaced cell are "words affected by this move" per section 9, and go through the normal validation/scoring/dictionary pipeline (including the disputed-word flow if the resulting word is unknown). Earlier, already-committed moves keep the score they were already awarded; replacing a tile does not retroactively change history.

### Open questions

See section 11 — blank-tile handling and which player's rack receives the displaced tile both need a decision before implementation.

---

## 8. Illegal mode

### Summary

Only words that are *not* recognized as standard dictionary words may be played. Every move still goes through the normal opponent-approval flow (`game-rules.md` sections 15–19) — Illegal mode does not skip approval, it makes approval mandatory for every move instead of only for unknown words.

### Rule change

This overrides `game-rules.md` section 11 (standard dictionary validity) for the purpose of what may be *submitted*, without changing section 15–19's approval mechanic itself:

- A move may not be committed if it forms a word classified `DICTIONARY_WORD` (`dictionary.md`).
- Every move's formed words must instead go through the proposal/approval flow described in section 15–19, exactly as an ordinary unknown word does today.
- `FORBIDDEN_WORD` (currently: one-letter words only, per `decisions.md` DEC-007) is unaffected — those remain hard-blocked in Illegal mode too.

### Open questions

Whether `ACCEPTED_IN_GAME` words (previously approved this game) remain playable, and how a partially-dictionary-valid multi-word move is treated, are open — see section 11.

---

## 9. Polyglot mode

### Summary

A game is configured with two or more languages. A formed word is treated as a standard dictionary word if it is found in *any* of the selected languages' dictionaries.

### Rule change

This overrides `game-rules.md` section 11 by evaluating dictionary membership against a set of languages instead of a single fixed one. `dictionary.md`'s classification (`DICTIONARY_WORD` / `ACCEPTED_IN_GAME` / `UNKNOWN_WORD` / `FORBIDDEN_WORD`) is otherwise unchanged; it is simply evaluated once per selected language, and the result is `DICTIONARY_WORD` if any one of them matches.

The board, tile set, and rack letters are not affected — the same single physical tile set/board configured for the game is used throughout (consistent with Wild mode's "dictionary only" scope in section 10). A word using letters outside a given language's alphabet simply cannot match that language's dictionary; it can still match another selected language, or fall through to the normal unknown-word flow.

### Dependency

Only meaningful once more than one `LanguageDefinition` and dictionary exist (`content-model.md` section 9), i.e. after roadmap Milestone 8. With only Swedish configured, Polyglot mode is a no-op equivalent to the standard rules.

---

## 10. Wild mode

### Summary

The game is configured with an ordered list of two or more languages. After every full round (both players have completed one turn since the last rotation), the *active* language for dictionary validation advances to the next language in the list, cycling back to the start after the last one.

### Rule change

This overrides `game-rules.md` section 11 by making "the dictionary" a value that changes over the course of the game rather than a fixed configuration. A move is validated against whichever language is active at the moment that move is committed.

As decided for this project (rather than a full tile-set swap): the board and physical tile set do not change when the active language rotates — only which dictionary is used to classify newly formed words changes. A word using letters absent from the newly active language's alphabet will simply tend to miss that language's dictionary and fall through to the unknown-word flow, exactly like any other unrecognized word.

### Dependency

Same as Polyglot mode (section 9) — requires Milestone 8's multi-language groundwork to be meaningful.

### Open questions

Whether accepted vocabulary is scoped per active language or shared across the whole game is open — see section 11.

---

## 11. Open questions requiring a project-owner decision

Do not resolve these silently during implementation. Each should become a `decisions.md` entry once answered, and this document updated to match.

1. **Replace mode — which rack receives the displaced tile.** Section 7 assumes the replacing player's own rack. Confirm this is intended (it lets a player take tiles the opponent originally played), rather than, for example, returning the tile to its original player.
2. **Replace mode — displaced blank tiles.** `game-rules.md` section 20 says a blank's represented letter is "permanently" fixed once committed. If a blank tile is displaced back to a rack under Replace mode, does it reset to a reusable blank, or keep representing its old letter forever? Both are defensible; this document does not choose one.
3. **Illegal mode — `ACCEPTED_IN_GAME` words.** Once a word has been accepted into a game's vocabulary (section 17 of `game-rules.md`), is it still playable under Illegal mode (since it's now "accepted," arguably no longer illegal), or does it remain playable only because it is still not a *standard* dictionary word? Needs an explicit answer.
4. **Illegal mode — partially-dictionary-valid multi-word moves.** If a single move forms several words and only some are dictionary words, is the whole move blocked (strict reading of "only illegal words are allowed"), or is it treated like today's multi-word approval unit (blocked only if *no* word in the move is non-dictionary)? Needs an explicit answer.
5. **Illegal + Polyglot interaction detail.** Confirmed direction (a word must be illegal in every selected language) is recorded in section 8's compatibility notes as the working assumption, but has not been explicitly confirmed by the project owner.
6. **Wild mode — accepted-vocabulary scope.** Is a word accepted while one language was active automatically treated as accepted when the active language later changes, or is accepted vocabulary tracked per language? `content-model.md` section 28 currently models accepted vocabulary as one flat set per game, which would need extending either way.
7. **Polyglot + Wild combination.** Currently `UNDECIDED`/mutually exclusive per section 5. Decide whether any combined behaviour is wanted, and if so, define it, before removing the exclusion.

---

## 12. Roadmap and task placement

Per the project owner's direction:

- Crisscross, Replace, and Illegal mode belong to a milestone positioned after Version 1 and after real playtesting (roadmap Milestone 4.4), since they only require the existing Swedish configuration.
- Polyglot and Wild mode belong to a milestone positioned after roadmap Milestone 8 (additional languages), since they are no-ops without a second configured language.

See `roadmap.md` for the corresponding milestones and `tasks.md` for their task breakdowns.
