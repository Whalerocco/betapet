# Decisions

## 1. Purpose

This file is the project's decision log.

Claude Code should use it to record meaningful implementation and architecture decisions that are made while building the game but are not already explicitly dictated by the specification documents.

The purpose is to make it easy to understand later:

- What was decided
- Why it was decided
- What alternatives were considered
- What consequences the decision has
- Whether the decision can be revisited

This prevents important reasoning from existing only in a chat session or disappearing into implementation details.

---

# 2. When to add a decision

Add an entry when Claude makes a choice that is likely to matter later.

Examples include:

- Choosing between two reasonable implementation approaches
- Choosing a library or dependency
- Choosing a data representation
- Choosing a persistence strategy within the boundaries of the existing plan
- Choosing how to structure an API
- Choosing how to solve a performance problem
- Choosing a testing strategy
- Choosing how to represent a state transition
- Choosing a dictionary data format
- Choosing how to serialize a runtime structure
- Choosing a browser interaction pattern where the specifications allow several approaches

A decision should generally be recorded if a future developer might reasonably ask:

> Why was it built this way?

---

# 3. When not to add a decision

Do not use this file as a development diary.

Do not add entries for:

- Trivial variable names
- Routine refactoring
- Formatting changes
- Obvious bug fixes
- Small CSS adjustments
- Decisions already explicitly defined by the project specifications
- Temporary debugging approaches
- Every package installation when there was no meaningful choice

Keep the log useful and relatively concise.

---

# 4. Specifications take precedence

This file does not override the specification documents.

The hierarchy is:

```text
Project owner decisions
        ↓
Specification documents
        ↓
decisions.md
        ↓
Implementation details
```

If a specification explicitly says how something should behave, Claude must follow the specification rather than create a conflicting decision here.

Examples:

```text
Opponent rejection returns the turn to the proposer.
```

This is a game rule and should not be re-decided in `decisions.md`.

Likewise:

```text
Local multiplayer uses hot-seat handoffs.
```

is already specified.

---

# 5. Claude's decision authority

Claude may make implementation decisions independently when:

- The specifications leave the detail open.
- The decision does not change gameplay.
- The decision does not significantly expand scope.
- The decision is reasonably reversible.
- The choice follows the project's maintainability goals.

Claude should prefer the simplest maintainable solution.

---

# 6. When Claude should ask instead

Claude should not silently record a decision and proceed when the choice would materially affect:

- Game rules
- User-visible product behaviour
- Version 1 scope
- Dictionary legality policy
- Scoring
- Privacy expectations
- Existing saved-game compatibility
- Major architecture direction
- Hosting cost or paid external services
- Licensing
- Security model
- A previously agreed specification

In those cases, Claude should stop and ask the project owner.

After the answer, the resulting decision may be recorded here if useful.

---

# 7. Decision IDs

Use sequential IDs:

```text
DEC-001
DEC-002
DEC-003
...
```

Never reuse an ID.

If a decision is superseded, keep the original entry and mark it accordingly rather than deleting it.

This preserves project history.

---

# 8. Decision status

Use one of:

```text
PROPOSED
ACCEPTED
SUPERSEDED
REJECTED
```

Normally, decisions Claude is authorized to make should be recorded directly as:

```text
ACCEPTED
```

Use `PROPOSED` when a decision requires project-owner approval.

If a later decision replaces an earlier one, mark the old entry:

```text
SUPERSEDED
```

and link to the replacement decision ID.

---

# 9. Decision format

Use the following template for every decision.

```markdown
## DEC-XXX — Short decision title

**Date:** YYYY-MM-DD  
**Status:** ACCEPTED  
**Area:** Engine / UI / Dictionary / Persistence / Testing / Tooling / Online / Other

### Context

Describe the problem or choice that required a decision.

### Decision

State exactly what was chosen.

### Alternatives considered

- Alternative A — short explanation
- Alternative B — short explanation

### Rationale

Explain why the selected approach was preferred.

### Consequences

Describe important consequences, tradeoffs, or constraints created by the decision.

### Revisit when

State when this decision should reasonably be reconsidered, or write:

`No specific revisit condition.`
```

---

# 10. Keep entries self-contained

A decision entry should make sense without access to the Claude conversation that produced it.

Avoid entries such as:

```text
We chose option 2 because it seemed better.
```

Prefer:

```text
We will store accepted vocabulary as normalized strings in a Set at runtime because membership lookup is the primary operation and duplicate entries should be impossible.
```

The reader should be able to understand the decision months later.

---

# 11. Reference relevant files

When useful, mention the specification or implementation files affected by the decision.

For example:

```text
Relevant files:
- src/game/dictionary/normalize.ts
- src/game/state/game-state.ts
- docs/dictionary.md
```

Do not add references merely for completeness.

---

# 12. Do not rewrite history

If an accepted decision later turns out to be wrong:

Do not delete it.

Instead:

1. Mark it `SUPERSEDED`.
2. Add:

```text
Superseded by: DEC-XXX
```

3. Create a new decision explaining the new approach.

This gives the project an understandable history.

---

# 13. Example decision

The following is an example only.

It is not an actual project decision and should not be treated as one.

```markdown
## DEC-000 — Example: runtime accepted-vocabulary structure

**Date:** 2026-08-10
**Status:** ACCEPTED
**Area:** Engine

### Context

The game frequently needs to determine whether a normalized unknown word has already been accepted during the current match.

### Decision

Use a `Set<string>` for accepted-word membership at runtime and explicitly convert it to an array during serialization.

### Alternatives considered

- Array only — simpler serialization but linear membership lookup.
- Object/map — supports metadata but adds complexity when membership is the primary operation.

### Rationale

A Set expresses uniqueness and membership semantics directly.

### Consequences

Serialization and deserialization must explicitly convert between the runtime Set and JSON-compatible representation.

### Revisit when

Reconsider if accepted vocabulary needs substantial per-word runtime metadata.
```

Again, `DEC-000` is only an illustration.

Real decisions begin with:

```text
DEC-001
```

---

# 14. Decision categories

Use the `Area` field consistently where possible.

Suggested values:

```text
Architecture
Engine
Game State
Dictionary
Scoring
UI
Local Multiplayer
Persistence
Testing
Tooling
Performance
Accessibility
Online Multiplayer
Database
Authentication
Security
Deployment
Other
```

Additional categories may be introduced when useful.

---

# 15. Relationship to tasks.md

`tasks.md` answers:

> What needs to be implemented?

`decisions.md` answers:

> Why was this particular implementation approach chosen?

Do not turn decisions into task checklists.

If a decision creates new work, update `tasks.md` separately when appropriate.

---

# 16. Relationship to roadmap.md

`roadmap.md` defines:

- Major milestones
- Development order
- Version boundaries

Claude should not use `decisions.md` to reorder the roadmap without project-owner approval.

For example, Claude must not record:

```text
DEC-014 — Implement online multiplayer before local persistence
```

if that contradicts `roadmap.md`.

---

# 17. Relationship to specification files

The specification documents describe the intended system.

Examples include:

```text
vision.md
architecture.md
tech-stack.md
game-rules.md
game-engine.md
dictionary.md
content-model.md
ui-design.md
local-multiplayer.md
online-multiplayer.md
```

When implementation requires filling in an unspecified technical detail, record a decision here if it is significant.

Do not modify a specification merely to document a small implementation choice.

---

# 18. Updating specifications

Sometimes an implementation discussion reveals a genuine product or architectural decision that belongs in the specification itself.

In that case:

1. Get project-owner approval if required.
2. Update the relevant specification.
3. Optionally record the decision here with a reference to that specification.

The specification becomes the authoritative description.

The decision log preserves why the change was made.

---

# 19. Decision quality

A useful decision should be:

```text
Specific
Understandable
Relevant
Concise
Traceable
```

Avoid long essays.

The rationale should contain enough information to prevent the same debate from having to be reconstructed later.

---

# 20. Reversibility

Prefer reversible decisions when possible, especially early in development.

If two approaches are similarly good, prefer the one that:

- Introduces fewer dependencies
- Couples fewer modules
- Is easier to test
- Is easier to replace
- Keeps the core engine pure
- Avoids premature infrastructure

This principle is particularly important before Version 1 is complete.

---

# 21. External dependencies

Any meaningful new runtime dependency should be considered carefully.

Record a decision when:

- Several viable libraries exist
- The dependency affects architecture
- The dependency is difficult to remove
- It materially increases bundle size or complexity
- It introduces an external service
- It has licensing implications

The entry should include why the dependency is preferable to implementing the required functionality with existing project tools.

---

# 22. Dictionary decisions

Dictionary-related decisions deserve particular care because they can affect game behaviour.

Record significant choices such as:

- Runtime dictionary format
- Preprocessing format
- Indexing strategy
- Versioning strategy
- Exception-list representation

Do not independently decide changes to what categories of words are legal if those changes alter the agreed game rules.

Ask the project owner instead.

---

# 23. Persistence decisions

Record meaningful decisions involving:

- Saved-game schema
- Schema migration strategy
- Serialization representation
- Compatibility handling

Do not introduce breaking saved-game changes casually.

If a decision can invalidate existing saved games, surface that consequence explicitly.

---

# 24. Online decisions

When online development begins, this log will become particularly important.

Record choices involving:

- Backend platform
- Database representation
- Authentication provider
- API style
- Realtime strategy
- Concurrency control
- Server deployment
- Player-safe view generation

Major choices involving external services or recurring costs should be confirmed with the project owner first.

---

# 25. Reviewing the log

Before making a significant implementation decision, Claude should briefly check whether an earlier decision already covers the issue.

Do not create duplicate decisions.

If the new situation changes an existing decision, supersede it explicitly.

---

# 26. Current decisions

Add new entries below this section.

---

<!--
Add real decisions below this line.

Example heading:

## DEC-001 — Decision title

Do not use DEC-000; it is reserved for examples in this document.
-->

## DEC-001 — Interim board and tile-set substitution (Scrabble instead of Alfapet)

**Date:** 2026-08-10
**Status:** ACCEPTED
**Area:** Engine

### Context

Milestone 1.1 ("Verified Swedish configuration") requires encoding the real physical Swedish Alfapet board layout and tile distribution. `game-rules.md` explicitly required this data to be verified against the physical game or a reliable reference, and explicitly forbade substituting Scrabble values.

A thorough search was carried out: the official Alga rulebook PDF, spelregler.org (the project's named primary reference), Wikipedia, BoardGameGeek, and several Swedish rules/strategy sites. This confirmed the board is 17×17 (not 15×15) with 120 tiles total, and yielded point values for a handful of letters read directly off example diagrams in the official rulebook (K=3, A=1, B=4, E=1, L=1, Å=4, T=1, O=2, R=1, S=1), but no source published the complete letter-by-letter distribution or the full board layout. Two images the project owner subsequently shared to fill the gap turned out, on inspection, to depict a Swedish Scrabble tile set and a standard English Scrabble board respectively — not Alfapet.

### Decision

Given the real Alfapet data is not obtainable from an available source, Version 1 uses:

- The standard 15×15 Scrabble board layout (8 Word×3, 17 Word×2 including centre, 12 Letter×3, 24 Letter×2 squares — no Word×4, Letter×4, or Letter×−2 squares).
- The standard Swedish Scrabble tile distribution: 98 letter tiles (A–Z minus Q and W, plus Å/Ä/Ö) + 2 blanks = 100 tiles, with the standard Swedish Scrabble point values.

This was an explicit project-owner instruction, given after the gap and the mismatched images were surfaced. `game-rules.md` sections 3, 4, and 34 were updated accordingly, and this decision is referenced from there.

### Alternatives considered

- Keep searching for a genuine Alfapet source — tried extensively (~10 sources) without success; diminishing returns.
- Ask the project owner to consult/photograph the physical game — the project owner does not have reliable access to correctly-photographed Alfapet components right now.
- Fabricate plausible Alfapet-like values — explicitly forbidden by `game-rules.md` and `CLAUDE.md`, and would misrepresent an unverified guess as verified data.

### Consequences

- Betapet's board is 15×15, not the real Alfapet 17×17 — a real Alfapet board would need re-verified multiplier positions across a larger board, a non-trivial follow-up.
- Scoring behaviour (letter/word multiplier magnitudes and positions) will not match real Swedish Alfapet until this is revisited; it will, however, match standard Swedish Scrabble.
- No Letter×4, Word×4, or Letter×−2 squares exist on the current board, even though the engine's `Multiplier` type still supports them for a future Alfapet board.
- `CLAUDE.md`'s "Do not substitute generic Scrabble rules for Alfapet rules" was updated to note this specific, deliberate, tracked exception (board layout and tile set only — turn structure, scoring formulas, word-approval flow, etc. remain Alfapet-derived per `game-rules.md`).

### Revisit when

Genuine Swedish Alfapet board/tile data becomes available (e.g. the project owner gets a clear photograph of the physical board and tile bag, or a reliable published source is found). At that point, update `game-rules.md` sections 3 and 4, mark this decision `SUPERSEDED`, and replace the board/tile data files referenced from it.

Relevant files:
- `docs/game-rules.md` (sections 3, 4, 34)
- `src/data/board/scrabbleBoard.ts`
- `src/data/tiles/swedishScrabbleTiles.ts`

## DEC-002 — Starting-player tie-break: return both tiles and redraw

**Date:** 2026-08-10
**Status:** ACCEPTED
**Area:** Engine

### Context

`game-rules.md` section 2 says: "The players draw one tile each to determine who starts. The player with the highest tile value starts." It does not say what happens if both drawn tiles have equal point value — a realistic case, since many letters share the same point value.

### Decision

On a tie, both tiles are returned to the tile bag (appended to the end, no reshuffle needed since the bag was already randomly shuffled once) and the draw is repeated until a strict winner emerges. Implemented in `determineStartingPlayer` in `src/game/engine/createGame.ts`.

### Alternatives considered

- Reshuffle the whole bag before each retry — functionally equivalent (any position in an already-random permutation is equally random) but adds complexity and makes tests depend on the random source instead of plain array order.
- Alphabetical/arbitrary tie-break (e.g. player one always wins ties) — simpler but not what the physical game's "draw again" convention implies, and would be a less faithful default.

### Rationale

"Draw again" is the standard, unsurprising convention for this kind of tied physical draw, and appending the tied tiles to the end of an already-shuffled bag is equally fair to a full reshuffle while being trivial to test deterministically.

### Consequences

None beyond the implementation itself; this does not change any other rule.

### Revisit when

If a verified Alfapet source specifies an explicit tie-break procedure, switch to it and supersede this decision.

Relevant files:
- `src/game/engine/createGame.ts`

## DEC-003 — Dictionary source: SALDO/SALDOM (Språkbanken)

**Date:** 2026-08-11
**Status:** ACCEPTED
**Area:** Dictionary

### Context

`docs/dictionary.md` section 41 requires the dictionary source and its license to be decided and
documented before implementation begins. Two viable, well-researched candidates were found:
SALDO/SALDOM (Språkbanken, CC-BY-4.0) and hunspell-sv (yeager/hunspell-sv, LGPL-3.0, itself built
in part from SALDO plus SFOL and SAOL15 references). Both were presented to the project owner.

### Decision

Use **SALDO** and **SALDOM** (SALDO's morphological component), published by Språkbanken Text,
University of Gothenburg, under CC-BY-4.0. Confirmed free to download and use with no payment,
account, or institutional affiliation required.

### Alternatives considered

- hunspell-sv (LGPL-3.0) — more "ready to use" as an actual flat word list format, actively
  maintained, but LGPL is more legally involved for redistributing a filtered/transformed
  derivative of the data than CC-BY-4.0's simple attribution requirement.
- A small placeholder/synthetic word list — would have let implementation proceed without
  resolving the licensing question, but only defers a decision `dictionary.md` requires up front.

### Rationale

CC-BY-4.0 has no copyleft implications for the generated, filtered word list this project ships:
attribution is the only requirement. SALDO/SALDOM is also an official academic linguistic
resource specifically for Swedish, with SALDOM providing full inflected word forms (not just
lemmas), which `dictionary.md` section 41 explicitly calls out as something to verify
("word-form coverage").

### Consequences

- `scripts/preprocess-dictionary.ts` extracts and filters `writtenForm` values from the raw
  LMF/XML source files (~330 MB combined) into `src/data/dictionary/sv-saldo-words.json`
  (885,438 unique playable single-word forms). The raw source files are gitignored and not
  committed; see `scripts/dictionary-raw-sources/README.md` to regenerate.
- The generated word list is not yet filtered for proper names, place names, or abbreviations —
  see `src/data/dictionary/SOURCE.md` and roadmap Milestone 2.2.
- Attribution to Borin, Lönngren, and Forsberg (2017) / Språkbanken must be preserved wherever
  the project's data sources or credits are documented.

### Revisit when

If a dictionary update is needed (`dictionary.md` section 32), or if word-form coverage or
quality issues are found during playtesting that a different source would resolve.

Relevant files:
- `scripts/preprocess-dictionary.ts`
- `scripts/dictionary-raw-sources/README.md`
- `src/data/dictionary/SOURCE.md`
- `src/data/dictionary/sv-saldo-words.json`

## DEC-004 — Country allow-list scoped to UN member states

**Date:** 2026-08-11
**Status:** ACCEPTED
**Area:** Dictionary

### Context

`dictionary.md` section 12 requires an explicit country allow-list as an exception to the
general ban on geographical names. A reference list of ~266 Swedish country/territory names was
found (Wiktionary's "Länder och nationaliteter" appendix), but it mixes sovereign states with
sub-national regions (e.g. Texas, Wales, Katalonien), dependent territories (e.g. Guam,
Bermuda), and states with disputed or partial international recognition (e.g. Kosovo, Taiwan,
Palestine, Vatican City).

### Decision

Scope `allowedCountries.ts` to sovereign UN member states only, using Swedish short-form names.
This excludes sub-national regions/territories entirely, and excludes disputed/
partially-recognized states even though some are commonly referred to as countries in everyday
Swedish usage.

### Alternatives considered

- Include the full raw reference list — more generous, but "country" would then include US
  states and UK constituent countries, which doesn't match the plain reading of
  `dictionary.md`'s examples (SVERIGE, NORGE, SPANIEN, FRANKRIKE — all sovereign nations).
- Include commonly-recognized-but-disputed states (Kosovo, Taiwan, etc.) — would require this
  project to take its own position on contested sovereignty, which UN membership avoids by using
  an existing, neutral, externally-defined line.

### Rationale

UN membership is a single, well-defined, externally-maintained boundary that doesn't require
this project to make its own geopolitical judgment calls, while still matching the plain
examples given in `dictionary.md`.

### Consequences

A handful of commonly-known but non-UN-member places (Taiwan, Kosovo, Vatican City, Scotland,
Texas, etc.) will be treated as ordinary geographical names — i.e. forbidden if SALDO tags them
as proper-noun-only, exactly like any other place name.

### Revisit when

If playtesting surfaces this as a real friction point, or if the project owner wants a
different, explicitly documented scope. This is a plain data list (`allowedCountries.ts`) and
trivial to change.

Relevant files:
- `src/game/dictionary/allowedCountries.ts`
- `src/data/dictionary/SOURCE.md`

## DEC-005 — Game-end condition: bag empty AND a player's rack empty

**Date:** 2026-08-11
**Status:** ACCEPTED
**Area:** Engine

### Context

`game-rules.md` section 29 lists "there are no letter tiles left in the bag" as one of three
end conditions, but explicitly flags it as needing verification: "the exact interaction between
an empty tile bag and the player who has just emptied their rack must follow the chosen Alfapet
rule interpretation." Taken completely literally, "bag empty" alone would end the game the
moment the bag runs out, even while both players still hold full racks and could keep playing
from them for many more turns.

### Decision

Interpret this condition as: the bag is empty **and** at least one player has emptied their
rack (i.e. someone "goes out"). Implemented in `checkGameEnd`.

### Alternatives considered

- Bag empty alone ends the game immediately, regardless of rack contents — doesn't fit
  `game-rules.md` section 30's final-scoring rule (deducting remaining rack tiles from each
  player's score only makes sense if the game continued until someone ran out of tiles to play,
  not the instant the bag happened to empty).
- Stop and ask before implementing anything — considered, but this is the near-universal,
  extremely well-established convention across the entire Scrabble-family of games (Alfapet
  included), unlike the board/tile-data and dictionary-source gaps that had no reasonable
  default to fall back on.

### Rationale

This is standard, unambiguous convention for this entire game genre, and is the only reading
that makes `game-rules.md` section 30 (remaining-rack deduction) coherent.

### Consequences

If a verified Alfapet source specifies different behaviour, this needs to change; the two other
end conditions (consecutive passes, no player can play) are not yet implemented (Milestone
2.6) and don't interact with this one.

### Revisit when

If a verified Alfapet source specifies a different end-condition interpretation.

Relevant files:
- `src/game/engine/gameEndCheck.ts`

---

## DEC-006 — Exchange minimum-bag-size rule and pass-count interaction

**Date:** 2026-08-11
**Status:** ACCEPTED
**Area:** Engine

### Context

`game-rules.md` section 26 requires that "the implementation must enforce the physical game's
constraints concerning whether enough tiles remain to perform an exchange," without stating an
exact number. Separately, section 27/29 track "consecutive passes" for the end-game rule, and it
is not stated whether an exchange should count toward, or reset, that counter.

### Decision

1. A player may exchange N tiles only if the bag currently holds at least N tiles (so every
   exchanged tile is replaced 1:1, matching the section 6/26 "the player receives the same
   number of replacement tiles as tiles exchanged" rule). Implemented in `exchangeTiles.ts` as
   `EXCHANGE_NOT_ALLOWED`.
2. Exchanging resets `consecutivePasses` to 0, the same as a committed word move. Only a literal
   pass action increments it. Section 29 states the end condition as players having "passed"
   in succession, not more broadly "taken a non-scoring turn," so an exchange — which is a
   distinct, separately-named action in section 26 — is not read as a pass for this purpose.

### Alternatives considered

- Requiring a fixed minimum bag size regardless of exchange count (e.g. real-world tournament
  Scrabble's "at least 7 tiles in the bag to exchange at all") — rejected; that is a
  tournament-specific convention with no basis in `game-rules.md`, which only ever talks about
  the exchange being limited by what the bag can replace.
- Treating exchanges as counting toward consecutive passes (i.e. any non-word-forming turn
  resets nothing, both types accumulate toward game end) — rejected as a looser reading than
  the specification text supports; would also make it impossible for two players to legitimately
  exchange tiles back and forth many times without ending the game, which is not implied by
  anything in `game-rules.md`.

### Rationale

Both readings are the narrowest, most literal application of the specification text available,
without inventing numeric thresholds the spec does not provide.

### Consequences

A player can never exchange more tiles than remain in the bag. Two players can exchange tiles
indefinitely without triggering the consecutive-pass end condition; only genuine passes do.

### Revisit when

If a verified Alfapet source specifies an exact minimum-bag-size rule for exchanges, or
clarifies that exchanges should count toward the consecutive-pass condition.

Relevant files:
- `src/game/engine/exchangeTiles.ts`
- `src/game/engine/gameEndCheck.ts`

---

## DEC-007 — Proper names, place names, and non-standard abbreviations are UNKNOWN_WORD, not FORBIDDEN_WORD

**Date:** 2026-08-11
**Status:** ACCEPTED
**Area:** Engine / Dictionary

### Context

Prior to this decision, `game-rules.md` and `dictionary.md` explicitly documented proper names,
geographical names, and non-standard abbreviations as `FORBIDDEN_WORD`: the engine rejected a
move containing one of these outright, before the proposing player ever had a chance to attempt
it, and "the opponent cannot override explicit forbidden-word rules" (the previous wording of
`docs/examples/disputed-word-example.md` section 41-43). Only a genuine dictionary miss (e.g. a
made-up word) could enter the disputed-word approval flow.

The project owner explicitly requested changing this: a player should be able to attempt
*any* word — including proper nouns and abbreviations — with the opponent deciding whether to
accept it, the same as any other word not found in the dictionary. In their words: "there
should not be any words that the user can't attempt to play."

### Decision

Reclassify proper names, geographical names, and non-standard abbreviations from
`FORBIDDEN_WORD` to `UNKNOWN_WORD` in `classifyWord`. These categories now flow through the
existing disputed-word proposal/approval mechanic exactly like a word genuinely absent from the
dictionary, rather than being hard-blocked before the proposing player can act.

`FORBIDDEN_WORD` is retained for exactly one remaining case: one-letter words (game-rules.md
section 10's minimum-word-length rule). This is a structural constraint on what counts as a
"word" at all, not a judgment about the word's content, and the project owner's request was
specifically about content categories ("proper nouns" as the named example) — nothing in the
request suggested a single stray letter should become an attemptable "word."

The explicit allow-lists (countries, months, weekdays, `allowedAbbreviations`) are unaffected:
those words still auto-accept as ordinary dictionary words, with no proposal step needed.

### Alternatives considered

- Keep `FORBIDDEN_WORD` for these categories but add a UI-level "propose anyway" override —
  rejected: this would mean the UI overriding an engine legality decision, which
  `architecture.md` section 24 explicitly disallows ("The UI must not independently decide...
  whether a word is valid").
- Also reclassify one-letter words as `UNKNOWN_WORD` — rejected as outside the scope of the
  request; a one-letter fragment isn't a "word" a player would ever deliberately attempt, and
  keeping the minimum-length rule as a hard structural constraint keeps `FORBIDDEN_WORD`
  meaningful rather than removing the status from the codebase entirely.
- Silently keep the old FORBIDDEN_WORD spec and treat the request as an ambiguity to flag —
  rejected: the request was an explicit, unambiguous instruction from the project owner about
  desired gameplay, not a case where the specification was silent.

### Rationale

This is a deliberate specification change requested by the project owner, not an inferred
interpretation of a silent or ambiguous rule. `docs/game-rules.md` and `docs/dictionary.md`
have been updated to match, since a source-code behavior driven by an explicit request should
not be left contradicting its own specification documents.

### Consequences

- `WordValidationReason` no longer produces `PROPER_OR_PLACE_NAME` or `ABBREVIATION` from
  `classifyWord` (removed from the type); only `ONE_LETTER_WORD` remains reachable.
- Every word a player forms on the board can now be attempted; only a one-letter fragment
  blocks a move outright.
- `docs/examples/disputed-word-example.md` sections 41-43 and
  `docs/examples/normal-move-example.md` section 35 were updated to match; they no longer use
  proper names/abbreviations as `FORBIDDEN_WORD` examples.

### Revisit when

If a verified Alfapet source specifies that proper names/abbreviations must be hard-blocked
rather than subject to opponent approval, or if the project owner wants the reverse.

Relevant files:
- `src/game/dictionary/classifyWord.ts`
- `src/game/model/wordValidationResult.ts`
- `docs/dictionary.md`
- `docs/game-rules.md`
- `docs/examples/disputed-word-example.md`
- `docs/examples/normal-move-example.md`

## DEC-008 — Replace mode and Illegal mode: resolving game-modifiers.md's open questions

**Date:** 2026-08-18
**Status:** ACCEPTED
**Area:** Engine / Game State

### Context

`docs/game-modifiers.md` section 11 recorded four open questions blocking implementation of
Replace mode and Illegal mode (roadmap Milestone 4.5), explicitly left unresolved rather than
guessed per `CLAUDE.md`'s instruction not to invent gameplay behaviour. The project owner
answered all four directly.

### Decision

1. **Replace mode — displaced-tile ownership.** The tile displaced by a replace placement goes
   to the *replacing* player's rack, not back to whoever originally played it. A player can take
   a tile the opponent had on the board.
2. **Replace mode — displaced blanks.** A blank tile displaced back to a rack resets to a
   reusable blank: its previous represented-letter assignment is discarded, and it can be
   assigned a different letter the next time it's played, the same as a blank that was never
   committed.
3. **Illegal mode — `ACCEPTED_IN_GAME` words.** These remain playable. `ACCEPTED_IN_GAME` is
   treated as its own category, distinct from `DICTIONARY_WORD`, for the purposes of Illegal
   mode's "only illegal words are allowed" restriction — only `DICTIONARY_WORD` is blocked.
4. **Illegal mode — partially-dictionary-valid multi-word moves.** A move is blocked outright if
   *any* word it forms classifies as `DICTIONARY_WORD`, not only when every word does. This is
   the strict reading of "only illegal words are allowed": every word the move forms must be
   non-dictionary for the move to be submittable at all.

### Alternatives considered

For (1): returning the displaced tile to its original owner instead — rejected, the project
owner explicitly chose the "steal" behaviour.

For (2): keeping the blank's old represented letter permanently, per the literal wording of
`game-rules.md` section 20 — rejected in favor of resetting, since a displaced blank is
conceptually back in a rack, the same state as any blank before its first commitment.

For (3): blocking `ACCEPTED_IN_GAME` words alongside `DICTIONARY_WORD` — this was this
document's own recommended default (it read "no longer illegal" most literally), but the project
owner explicitly chose the opposite: accepted words keep a separate identity from real
dictionary words and remain playable under Illegal mode.

For (4): only blocking a move when every formed word is a dictionary word (matching today's
ordinary multi-word approval unit, where a move needs only one non-dictionary word to enter the
proposal flow) — rejected in favor of the stricter all-words-must-be-non-dictionary reading.

### Rationale

These are explicit project-owner answers to genuinely open design questions, not inferred
interpretations of a silent specification — recorded per `docs/decisions.md` section 18's
"Updating specifications" process.

### Consequences

- `docs/game-modifiers.md` sections 7, 8, and 11 are updated to state these as decided rules
  rather than open questions.
- Milestone 4.5 (Crisscross, Replace, Illegal mode) can now proceed to implementation.
- Item 5 in section 11 (Illegal + Polyglot interaction) and item 6-7 (Wild mode
  accepted-vocabulary scope; Polyglot + Wild combination) remain open, since Polyglot and Wild
  belong to the later Milestone 8.1 and were out of scope for this round of questions.

### Revisit when

Not expected to be revisited; these are settled project-owner decisions. If Milestone 8.1's
Polyglot/Wild work later reveals a conflict with rule (3) or (4) above, raise it as a new
decision rather than silently overriding this one.

Relevant files:
- `docs/game-modifiers.md`
