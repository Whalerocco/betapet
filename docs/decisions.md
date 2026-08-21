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

**Update (DEC-009, 2026-08-19):** the project owner has since decided to stop treating this as a temporary placeholder awaiting Alfapet data and adopt it as Betapet's permanent Version 1 board/tile configuration instead. This entry's account of the search and the original interim framing is left intact as history; DEC-009 is the current word on whether/how this gets revisited.

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
  see `src/data/dictionary/SOURCE-sv.md` and roadmap Milestone 2.2.
- Attribution to Borin, Lönngren, and Forsberg (2017) / Språkbanken must be preserved wherever
  the project's data sources or credits are documented.

### Revisit when

If a dictionary update is needed (`dictionary.md` section 32), or if word-form coverage or
quality issues are found during playtesting that a different source would resolve.

Relevant files:
- `scripts/preprocess-dictionary.ts`
- `scripts/dictionary-raw-sources/README.md`
- `src/data/dictionary/SOURCE-sv.md`
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
- `src/data/dictionary/SOURCE-sv.md`

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

## DEC-009 — Scrabble board and tile set adopted as Betapet's permanent configuration

**Date:** 2026-08-19
**Status:** ACCEPTED
**Area:** Engine / Documentation

### Context

DEC-001 adopted the standard 15×15 Scrabble board and Swedish Scrabble tile distribution as an
explicitly *interim* substitute for the real Swedish Alfapet board/tile data, after an extensive
(~10 source) search failed to turn up complete, reliable Alfapet board-layout or letter-distribution
data. That decision's "Revisit when" condition was genuine Alfapet source material becoming
available (a correctly-photographed physical board/tile bag, or a reliable published source). No
such material has emerged, and `tasks.md` T2.1 and the Version 1 release gate have consequently
carried five permanently-unchecked "verify against real Alfapet" boxes with no realistic path to
completion.

### Decision

Betapet stops pursuing Alfapet board/tile-set verification and adopts the Scrabble-derived board
and Swedish Scrabble tile distribution, exactly as already encoded in `src/data/board/scrabbleBoard.ts`
and `src/data/tiles/swedishScrabbleTiles.ts`, as its actual, permanent Version 1 configuration —
not a placeholder awaiting replacement. Turn structure, scoring formulas, the word-approval flow,
and every other Alfapet-derived rule are unaffected; this decision is scoped to the physical
board layout and tile distribution only, exactly as DEC-001 already scoped it.

A genuine Alfapet board/tile configuration may be added later, if the project owner wants it, as
an *additional* selectable configuration a player can choose at game setup (conceptually similar
to how `GameConfiguration.modifiers` already lets a game opt into rule variants) — not as a
replacement of the Scrabble-derived configuration this decision makes permanent. Designing or
scheduling that addition is explicitly out of scope here; this decision only removes the
"unverified, pending replacement" framing from the configuration Betapet already runs on.

### Alternatives considered

- Keep searching for genuine Alfapet source material indefinitely — rejected; DEC-001 already
  exhausted the reasonably available sources, and there is no new lead to pursue.
- Keep the "interim substitute, revisit later" framing indefinitely, with no active plan to
  revisit it — rejected as actively misleading: it left `tasks.md`/the release-gate checklist
  permanently reporting unresolved verification work that could never actually be resolved,
  and readers of `game-rules.md`/`CLAUDE.md` would reasonably assume "interim" means a near-term
  replacement is expected.
- Immediately design and build dual board/tile-set support (Scrabble + a real Alfapet option) —
  rejected as premature: no verified Alfapet data exists to build that second option from yet,
  and `CLAUDE.md`'s "do not prematurely build infrastructure for future features" applies.

### Consequences

- `CLAUDE.md`, `game-rules.md` (sections 1, 3, 4, 34), and `tasks.md` (T2.1, the Milestone 1.1
  roadmap entry, and the Version 1 release-gate checklist) are updated to describe the
  Scrabble-derived board/tile set as Betapet's actual configuration rather than an interim
  substitute, and the five previously-unverifiable checkboxes are checked off against that
  now-canonical reference (cross-checked by the existing `T2.2`/`T2.3` tests) instead of against
  the physical Alfapet game.
- No code or data changes are required — `scrabbleBoard.ts` and `swedishScrabbleTiles.ts` already
  encode exactly the values this decision makes permanent.
- `SWEDISH_CONFIGURATION_ID` ("sv-scrabble-v1") and related naming stay as-is; they already
  describe the Scrabble-derived configuration accurately.
- If a real Alfapet board/tile option is added later, it should be modeled as an alternate,
  selectable `BoardDefinition`/tile-set rather than a rewrite of the current one, so existing
  saved games and the Scrabble-derived configuration keep working unchanged.

### Revisit when

Only if the project owner wants to add a real Alfapet board/tile option later (an addition, per
the Decision above, not a replacement) — not because the Scrabble-derived configuration is
considered temporary or wrong.

Relevant files:
- `CLAUDE.md`
- `docs/game-rules.md` (sections 1, 3, 4, 34)
- `docs/tasks.md` (T2.1, Phase 4B)
- `docs/roadmap.md` (Milestone 1.1)
- `docs/decisions.md` (DEC-001)

## DEC-010 — Polyglot/Wild open questions resolved; a dictionary-only slice of Milestone 8 (German, French, English, Spanish) pulled ahead of Milestone 5

**Date:** 2026-08-19
**Status:** ACCEPTED
**Area:** Engine / Dictionary / Roadmap

### Context

`game-modifiers.md` section 11 recorded three open questions blocking Milestone 8.1 (Polyglot and
Wild mode), left unresolved rather than guessed per `CLAUDE.md`'s instruction not to invent
gameplay behaviour. Both `roadmap.md` and `tasks.md` explicitly gate any Milestone 8.1
implementation on these being resolved and recorded here first. Separately, the project owner
asked to pull a slice of roadmap Milestone 8 ("Additional languages") forward, ahead of Milestone
5 (online) — specifically to make Polyglot and Wild mode usable with German, French, English, and
Spanish, without waiting for the rest of the roadmap's online phase.

### Decision

1. **Illegal + Polyglot interaction.** A word must be illegal (non-dictionary) in *every* selected
   language to be playable under Illegal mode — not just one. This matches Illegal mode's existing
   rule (DEC-008) that a move is blocked if *any* formed word is dictionary-valid: composed with
   Polyglot's "valid if found in any selected language" rule, a word only counts as
   dictionary-valid (and therefore blocks the move) if at least one language matches, so no
   separate code path is needed beyond correct composition of the two existing mechanisms.
2. **Wild mode — accepted-vocabulary scope.** An unknown word accepted by the opponent stays valid
   for the rest of the game regardless of which language later becomes active. Accepted vocabulary
   remains one flat set per game, unchanged from today's model (`content-model.md` section 28) —
   no per-language tracking is added.
3. **Polyglot + Wild combination.** They stay mutually exclusive (`UNDECIDED` in the compatibility
   table) for now. No combined behaviour is designed in this round.
4. **Milestone 8 scope for this round.** Rather than building full Milestone 8 (per-language tile
   sets, boards, and UI translations — see `roadmap.md` "# 37"), only the dictionary/
   `LanguageDefinition` slice is built now, for German, French, English, and Spanish, sufficient to
   make Polyglot and Wild mode meaningful. This matches how both modifiers were already specified
   in `game-modifiers.md` sections 9-10: "the board, tile set, and rack letters are not affected —
   the same single physical tile set/board configured for the game is used throughout." Full
   Milestone 8 (new tile sets/boards/UI translations per language) remains future work in its
   original roadmap position, not started by this decision. Dictionary sourcing for the four new
   languages follows the same process as Swedish (DEC-001/DEC-003): candidate sources are
   researched and their licenses presented for explicit approval before anything is downloaded or
   committed to the repo.

### Alternatives considered

For (1): only requiring a word to be illegal in *at least one* selected language — rejected, since
the project owner wanted Illegal mode's existing strictness (already blocking on any single
dictionary-valid word) to compose consistently rather than becoming looser once Polyglot is added.

For (2): tracking accepted vocabulary per language, so a word accepted under German could revert
to `UNKNOWN_WORD` once Wild mode rotates to, say, Spanish — rejected as unnecessary extra state
and a worse player experience (a word the table already agreed was fine becoming disputed again
later), for no rule this project needs.

For (3): designing a combined Polyglot+Wild mode now (e.g. a rotating subset of languages) —
rejected as out of scope for this round; `game-modifiers.md` section 5 already flagged this as
conceivable but undesigned, and nothing requires solving it now.

For (4): building full Milestone 8 (real per-language boards/tile sets/UI translations) now,
instead of the scoped-down dictionary-only slice — rejected as substantially more work than
needed to unlock Polyglot/Wild, and outside what was actually requested; building unused
per-language board/tile infrastructure ahead of need would also cut against `CLAUDE.md`'s
"do not prematurely build infrastructure for future features."

### Rationale

These are explicit project-owner answers to genuinely open design questions and a genuine
roadmap-sequencing/scope choice, not inferred interpretations of a silent specification —
recorded per this file's own "Updating specifications" process, the same pattern DEC-008 used for
Replace/Illegal mode's open questions.

### Consequences

- `docs/game-modifiers.md` sections 5, 9, 10, 11, and 12 are updated to state these as decided
  rules rather than open questions, and to describe Milestone 8.1's dependency as the scoped-down
  Milestone 8 slice rather than the full milestone.
- `docs/roadmap.md` and `docs/tasks.md` are updated to reflect the scoped-down Milestone 8
  definition and its reordering ahead of Milestone 5.
- Milestone 8.1 (Polyglot, Wild) can now proceed to implementation once the scoped-down Milestone
  8 dictionary groundwork exists for at least one additional language.
- Dictionary sourcing research for German, French, English, and Spanish follows next, with license
  approval required before any data is committed — see the follow-up plan for the detailed
  per-language pipeline design once sources are approved.
- Milestone 5 (online) and everything after it in the roadmap are unaffected by this decision and
  remain gated on the project owner's explicit go-ahead, per `roadmap.md`/`CLAUDE.md`.

### Revisit when

Item 3 (Polyglot + Wild combination) could be revisited later if a concrete design for combining
them emerges. Item 4's scope reduction could be revisited if the project owner later wants full
per-language tile sets/boards (i.e. actually pursuing full Milestone 8), which would be a separate
decision, not an automatic extension of this one.

Relevant files:
- `docs/game-modifiers.md` (sections 5, 9, 10, 11, 12)
- `docs/roadmap.md` (Milestone 8, Milestone 8.1)
- `docs/tasks.md` (Phase 8, Phase 8A)

## DEC-011 — Dictionary sources for German, French, English, and Spanish

**Date:** 2026-08-19
**Status:** ACCEPTED
**Area:** Dictionary

### Context

DEC-010 pulled a dictionary-only slice of Milestone 8 forward, for German, French, English, and
Spanish. Following the same process DEC-001/DEC-003 used for Swedish (SALDO, CC-BY-4.0), four
candidate sources were researched per language, each verified against current, actual license
text (not assumed from memory), and presented to the project owner for approval before anything
is downloaded or committed. No source in any of the four languages was assumed equivalent to
another without checking — licenses varied significantly by language, and two of the four required
a genuine tradeoff decision rather than a clean pick.

### Decision

- **German**: [`hippler/german-wordlist`](https://github.com/hippler/german-wordlist) (a fork of
  `enz/german-wordlist`, used by the word game Tanglet), licensed **CC0-1.0** (public domain
  dedication — no conditions at all, not even attribution). ~686,000 words, plain text, curated
  specifically for word games: proper nouns, toponyms, abbreviations, archaic words, and outdated
  spellings are excluded by the source's own curation policy.
- **English**: [SCOWL](https://wordlist.aspell.net/) (Spell Checking Oriented Word Lists) by Kevin
  Atkinson, size ≤60. Short permissive notice (copy/modify/distribute/sell without fee, provided
  the copyright notice is retained) — the same license family Hunspell `en_US` itself is built
  from. Staying at size ≤60 avoids the one small attribution-text obligation (UKACD) that appears
  at larger sizes. Comfortably exceeds the project's word-count bar, and is already split into
  separate words/proper-names/abbreviations files.
- **French**: [Lexique383](http://www.lexique.org/) (Boris New & Christophe Pallier, CNRS-affiliated),
  licensed **CC BY-SA 4.0**. ~140,000 word forms with grammatical category/gender/number tagging.
  No French source matched SALDO's clean attribution-only bar; every viable option carried some
  copyleft/share-alike obligation. CC BY-SA was chosen over the LGPL-LR-licensed alternative
  (Morphalou 3.1) because CC licenses are purpose-built for data derivatives (unlike LGPL, which
  is a software license retrofitted onto data — the same "murkiness" reasoning that ruled out
  Hunspell `sv` for Swedish) and because Lexique383 is a plain, directly downloadable file rather
  than requiring ORTOLANG registration.
- **Spanish**: Spanish Wiktionary via Wiktextract ([kaikki.org/eswiktionary](https://kaikki.org/eswiktionary/index.html)),
  licensed **CC BY-SA 4.0 + GFDL** (dual, inherited from Wiktionary). ~1,035,000 senses with
  part-of-speech tagging (community-edited, so tagging completeness isn't guaranteed the way a
  purpose-built dictionary's would be). Chosen over Hunspell `es` (rla-es project, a disjunctive
  choice of GPL v3+/LGPL v3+/MPL v1.1+) for the same reason as French: CC BY-SA's terms are
  unambiguous for a data derivative, where the Hunspell license family already proved murky enough
  to reject for Swedish.

**Consequence of the French and Spanish choices**: because both are ShareAlike-licensed, the
French and Spanish word-list files Betapet ships must themselves be redistributable under CC
BY-SA 4.0 (with attribution), unlike the German (CC0, no obligation) and English (permissive
notice) files, and unlike Swedish's SALDO file (CC-BY-4.0, attribution only, no share-alike). This
does not affect Betapet's own application code license — only the specific derived dictionary
data files for these two languages.

### Alternatives considered

Per-language alternatives and why each was passed over are detailed in the Decision section above
and in the full research reports (not separately filed; summarized here and in the forthcoming
`SOURCE-<lang>.md` for each language once built). In short: sources requiring No-Derivatives clauses
(DWDS for German) or of unclear/proprietary provenance (official Scrabble word lists for English
and Spanish, RAE for Spanish) were ruled out outright as non-viable, not just less preferred.

### Rationale

Matches the bar `game-rules.md`/`dictionary.md` set for Swedish: offline-redistributable, clearly
licensed, no live network dependency. Where no attribution-only source existed (French, Spanish),
the project owner explicitly chose to accept a ShareAlike obligation rather than a software-style
copyleft license, consistent with the reasoning that already ruled out Hunspell `sv` for Swedish.

### Consequences

- Phase C (per the approved multi-language plan) proceeds: build the preprocessing pipeline for
  each language, generate `src/data/dictionary/<lang>-<source>-words.json` (plus
  `-exclusions.json` where the source supports deriving one) and a `SOURCE-<lang>.md`, mirroring
  the existing Swedish files (renamed `SOURCE.md` → `SOURCE-sv.md` for this reason), one language
  at a time.
- The French and Spanish `SOURCE-fr.md`/`SOURCE-es.md` files must state the CC BY-SA 4.0 obligation clearly, since
  it constrains how those two data files (not the rest of the codebase) may be reused downstream.
- No data has been downloaded or committed as of this decision — that is the next step.

### Revisit when

If a cleaner attribution-only (non-share-alike) source is later found for French or Spanish, or if
the chosen sources become unmaintained/removed, revisit and record a new decision rather than
silently swapping data.

**Update, French implementation (2026-08-19):** while implementing the French dictionary, a
discrepancy was found on lexique.org's own download page: the license link's visible text reads
"Creative Commons Attribution – Partage dans les mêmes conditions 4.0" (= CC BY-SA, matching the
choice above), but the link's underlying URL points to `creativecommons.org/licenses/by-nc/4.0/`
(Attribution-NonCommercial) instead of `.../by-sa/4.0/`. A GitHub mirror redistributing this exact
dataset (`SekouDiaoNlp/pylexique`) independently states "License: CC BY SA 4.0" in its own README,
linking to a file named `LICENSE-CC-BY-SA4.0.txt`. With two independent sources agreeing on BY-SA
and only the raw href disagreeing, the project owner explicitly confirmed treating this as a
broken/mistyped link on the live site and proceeding with CC BY-SA 4.0 as originally decided
above, rather than pausing implementation or switching to Morphalou. See
`src/data/dictionary/SOURCE-fr.md` for the full detail.

**Update, English implementation (2026-08-19):** the originally-approved SCOWL turned out not to
be distributable as a simple flat word list during implementation — its generator and GitHub
releases only offer Hunspell/Aspell dictionary packages requiring affix-expansion tooling to
produce a flat list, unlike German/French's sources. The project owner was informed and chose to
switch to **ENABLE** (public domain) instead — the other candidate already researched and
recommended in the original English research pass. See `src/data/dictionary/SOURCE-en.md` for the
full detail.

**Update, Spanish implementation (2026-08-19):** implemented as approved, no discrepancy found —
the export page directly and unambiguously states "This data is made available under the same
licenses as Wiktionary - both CC-BY-SA and GFDL." Notably, unlike French/English, this source's
`pos` field does support deriving real proper-noun/abbreviation exclusions the same way SALDO's
tags do for Swedish, so `allowedCountriesEs.ts` etc. behave like Swedish's allow-lists (genuinely
overriding an exclusion) rather than being largely inert like French's/English's. See
`src/data/dictionary/SOURCE-es.md` for the full detail.

All four languages (German, French, English, Spanish) are now implemented at the
dictionary/classification-rules layer. Remaining work — wiring language selection into
`GameConfiguration`, `ModifierId` (POLYGLOT/WILD), and the setup UI — is separate follow-up work
per the approved multi-language plan's Phases D onward, not part of this decision.

Relevant files:
- `src/data/dictionary/SOURCE-de.md`, `SOURCE-fr.md`, `SOURCE-en.md`, `SOURCE-es.md` (built)
- `docs/dictionary.md`

## DEC-012 — Wild mode accepted vocabulary is scoped per-language, superseding DEC-010 item 2

**Date:** 2026-08-19
**Status:** ACCEPTED
**Area:** Engine / Dictionary

### Context

After playtesting the completed Wild mode implementation, the project owner reported that an
unknown word accepted by the opponent while one language is active should only stay valid for
that language — not for every configured Wild language, as DEC-010 item 2 originally decided
("Accepted vocabulary remains one flat set per game... no per-language tracking is added"). This
directly reverses that earlier decision, at the project owner's explicit direction, rather than
correcting a bug: DEC-010 item 2 was itself a deliberate answer to an open question, now replaced
by a different deliberate answer.

### Decision

An unknown word accepted while Wild-mode language *L* is active becomes valid only when *L* is
the active language again — not automatically valid under every other configured Wild language.
Accepted vocabulary entries (`content-model.md` section 28) now carry an optional language tag,
set only for words accepted under Wild mode; words accepted in a plain or Polyglot game (where
Wild's per-language rotation doesn't apply) remain untagged and language-agnostic, exactly as
before.

### Alternatives considered

Keeping DEC-010 item 2's flat/shared behaviour — rejected: it's the very design the project owner
asked to change, having played the game and found it didn't match their intent for Wild mode.

Tracking a language tag for *every* accepted word, including plain and Polyglot games — rejected
as unnecessary: those modes have no rotating "active language" concept for a tag to scope against,
so an always-flat, untagged entry is simpler and behaviourally identical to today for those modes.

### Rationale

This is an explicit, direct correction from the project owner after hands-on play, which
`CLAUDE.md`'s "if source code conflicts with the specification, assume the specification is
correct... unless the task explicitly asks to change the specification" and this file's own
decision-recording process both treat as authoritative — the specification itself is being
deliberately changed here, not merely reinterpreted.

### Consequences

- `GameState.acceptedVocabulary` changes from a flat `readonly string[]` to a list of
  `{ word, languageCode? }` entries (`src/game/model/game.ts`).
- `src/game/engine/acceptedVocabulary.ts`'s `addAcceptedWord`/`acceptedVocabularySet` gain an
  optional `languageCode` parameter; the language-scoping filter lives entirely there —
  `classifyWord.ts`/`classifyWordAcrossLanguages.ts` are unchanged, since they only ever consumed
  an already-filtered flat set.
- `acceptProposedMove.ts` now takes `GameConfiguration` so it can resolve the Wild-active language
  at acceptance time (mirroring `submitMove.ts`'s existing use of `activeWildLanguageIndex`) and
  tag newly accepted words with it.
- `docs/game-modifiers.md` section 10 ("Accepted vocabulary") and section 11's resolved-item
  bullet, and `docs/content-model.md` section 28, are updated to describe the new per-language
  scoping instead of DEC-010's flat model.

### Revisit when

Not anticipated to need revisiting — this is now the intended, played-and-confirmed behaviour for
Wild mode.

Relevant files:
- `src/game/model/game.ts`
- `src/game/engine/acceptedVocabulary.ts`, `commitMove.ts`, `acceptProposedMove.ts`, `submitMove.ts`
- `docs/game-modifiers.md` (section 10, 11)
- `docs/content-model.md` (section 28)

## DEC-013 — Manual "Avsluta spel" (end game) action, deviating from the three standard Alfapet end conditions

**Date:** 2026-08-20
**Status:** ACCEPTED
**Area:** Engine / UI

### Context

`game-rules.md` section 29 documents the standard Alfapet game-end conditions — empty bag with an
empty rack, no player can play, or both players passing twice in succession — as the exhaustive
set. In practice, requiring two full rounds of passing (four consecutive passes) just to bail out
of a game neither player wants to continue is tedious, and the project owner asked for a direct
"Avsluta spel" button instead.

### Decision

Either player may end the game immediately at any time via a new `END_GAME` action, without
needing any of the three standard conditions to hold and without needing it to be their turn.
Final scoring is computed exactly the same way as any other ending (`calculateFinalResult`,
game-rules.md section 30 — each player's remaining rack tiles deducted from their score), tagged
with a new `MANUALLY_ENDED` `EndReason` so the result screen states how the game actually ended.
The action requires a confirmation dialog (ui-design.md section 35a) given how consequential and
irreversible it is.

### Alternatives considered

Freezing scores exactly as they stand, skipping the rack deduction — rejected: it would let a
player dodge the normal end-of-game rack penalty simply by choosing to manually end instead of
passing/running out the bag, undermining section 30's scoring rule for no reason.

Requiring the other player's approval before ending (mirroring the disputed-word approval flow) —
rejected as unnecessary extra friction for what's meant to be a quick, low-ceremony way out; a
confirmation dialog on the initiating player's own side is enough protection against an accidental
click, and either player already has the equivalent unilateral power to just stop responding.

### Rationale

An explicit project-owner decision after finding the two-passes requirement in practice annoying —
not an inferred interpretation of a silent specification. Recorded per this file's own process, matching how DEC-008/DEC-012 record similar direct corrections.

### Consequences

- `src/game/model/gameResult.ts`: `EndReason` gains `"MANUALLY_ENDED"`.
- `src/game/engine/endGame.ts` (new): validates the game is `ACTIVE` and `playerId` is one of the
  two players, returns any of the current player's in-progress placed tiles to their rack first
  (via the `returnPendingTilesToRack` helper extracted from `clearPendingMove.ts`, so those tiles
  still count toward the rack deduction rather than vanishing from the calculation), then jumps
  straight to `calculateFinalResult`/`status: "FINISHED"` — bypassing `finalizeTurn`/`checkGameEnd`
  entirely, since those are specifically for the three automatic conditions.
- `src/application/game-controller/gameController.ts`: new `END_GAME` action, threaded through like
  every other simple `{playerId}` action (e.g. `PASS`).
- `TurnActions.tsx` gets a new "Avsluta spel" button and its own confirmation dialog, mirroring the
  existing "Passa" confirmation pattern exactly (own trigger ref, own dialog, stronger wording).
- `docs/game-rules.md` section 29, `docs/ui-design.md` sections 35a/54, and this entry document the
  deviation from the three standard conditions.

### Revisit when

Not anticipated — this is a deliberate, permanent addition to the standard rule set for this
project, not a placeholder.

Relevant files:
- `src/game/model/gameResult.ts`
- `src/game/engine/endGame.ts`, `clearPendingMove.ts`
- `src/application/game-controller/gameController.ts`
- `src/components/game/TurnActions.tsx`, `GameOverScreen.tsx`
- `docs/game-rules.md` (section 29)
- `docs/ui-design.md` (section 35a, 54)

## DEC-014 — Crisscross connectivity: new tiles must connect to each other directly, not merely bridge through unrelated existing board tiles

**Date:** 2026-08-20
**Status:** ACCEPTED
**Area:** Engine / Rules spec

### Context

`game-modifiers.md` section 6 originally specified Crisscross connectivity as: "Every newly
placed tile is connected — directly or transitively through other newly placed tiles or existing
board tiles — into one single cluster." The implementation matched this literally: its BFS treated
every existing committed tile anywhere on the board as a valid stepping stone linking any two new
tiles together. In play, this let two entirely unrelated new-tile groups both be accepted in one
move as long as each one independently touched the existing board somewhere — e.g. one group
extending one arm of an existing crossing pair of words, and a second, unrelated group extending a
different arm of that same pre-existing structure, with no new tile of either group ever touching
a new tile of the other. The project owner reported this as a bug after encountering it in play,
and confirmed the intended rule: newly placed tiles must connect to each other directly (forming
one cohesive T/plus shape), and that combined structure must additionally touch the existing board
at some point — not two independently-board-touching groups linked only by the old board's own,
unrelated, pre-existing shape.

### Decision

Crisscross connectivity is now checked as: every newly placed tile must belong to a 2+ letter line
(row or column — new tiles plus any existing tiles filling gaps within that one line, exactly what
a normal single-word move already is), and those lines must connect to each other by sharing a
cell — e.g. a T or plus shape where one line crosses another, the shared cell can be new or
existing. Two lines that only reach each other via a longer detour through unrelated parts of the
existing board no longer count as connected. The separate "must connect to the existing board" (or
cover the centre, for the first move) requirement is unchanged and still applies to the cluster as
a whole.

### Alternatives considered

Keeping the original literal wording (any existing tile is a valid bridge) — rejected: this is
the exact behaviour the project owner reported as wrong after playing it, so keeping it would mean
knowingly shipping the reported bug.

### Rationale

Direct, played-and-confirmed feedback from the project owner, treated as an authoritative
specification correction per this file's process — not an inferred interpretation. `game-rules.md`
section 8's underlying principle (newly placed tiles normally form one connected line) is better
served by requiring genuine adjacency between the cluster's own lines, since Crisscross was always
meant to relax "one line" to "one connected shape," not to "any tiles that both eventually touch
the same old board."

### Consequences

- `docs/game-modifiers.md` section 6 is corrected to describe the new rule instead of the
  overly-permissive original wording.
- `src/game/rules/physicalValidation.ts`: `reachableOccupiedCoordinates` (whole-board BFS) is
  replaced by `isCrisscrossConnected`/`occupiedRun`/`mergeSharedGroups`, which build per-line runs
  and only merge runs that literally share a coordinate.
- The Crisscross-specific rejection also got its own error code, `NOT_CONNECTED_CLUSTER` (distinct
  from the generic `INVALID_PLACEMENT`), so a future rejection is unambiguous about why.
- New regression tests reproduce the exact reported scenario (two lines bridged only through an
  existing crossing pair of words) and confirm it's now rejected.

### Revisit when

Not anticipated — this is now the confirmed, intended rule.

Relevant files:
- `docs/game-modifiers.md` (section 6)
- `src/game/rules/physicalValidation.ts`, `physicalValidation.test.ts`
- `src/game/model/gameError.ts`
- `src/application/game-controller/errorMessages.ts`

## DEC-015 — Replace mode: a replace must change the cell's letter

**Date:** 2026-08-21
**Status:** ACCEPTED
**Area:** Engine / Rules spec

### Context

`game-modifiers.md` section 7 described which cells a replace placement may target (any committed
tile, with the no-chaining restriction) but said nothing about the *letter* on the replacing tile.
The implementation followed it literally, so an "R" could be played on top of an "R": a legal move
that changes nothing on the board, costs the player nothing — the identical tile comes straight
back to their rack — and exists only to re-trigger word detection, take an opponent's tile of that
letter, or pad a turn. The project owner reported this as a bug after encountering it in play and
confirmed the intended rule: a replacement must actually change the letter of the cell.

### Decision

A replace placement is rejected when the replacing tile would show the same letter the cell
already shows. Blanks are compared by the letter they represent on both sides: a blank chosen to
represent "R" may not replace an "R", and a plain "R" may not replace a committed blank already
representing "R". Replacing a letter with a different letter is unaffected, including swapping a
blank for a real tile of a different letter. The same check also guards re-lettering a
replace-placed blank, so the forbidden state cannot be reached in two steps.

### Alternatives considered

Allowing a same-letter replace but scoring it as zero — rejected: it still hands the replacing
player the opponent's tile and re-opens the word for approval, so the abusable part remains while
the rule gets harder to explain.

Restricting only "letter tile onto identical letter tile" and leaving blanks out of it — rejected:
what matters is the letter the cell shows, which is exactly what a blank's represented letter is;
excluding blanks would leave the same no-op move available through a blank.

### Rationale

Direct, played-and-confirmed feedback from the project owner, treated as an authoritative
specification correction per this file's process. The point of Replace mode is changing what a
cell says; a placement that leaves the cell identical is not a replacement at all.

### Consequences

- `docs/game-modifiers.md` section 7 gains an explicit bullet stating the rule.
- `src/game/engine/placeTile.ts` exports `replacesSameLetter`, used by `placeTile`,
  `movePendingTile`, and `changeBlankRepresentedLetter` so all three routes into the state are
  blocked identically.
- New error code `REPLACE_SAME_LETTER` (distinct from the generic `INVALID_PLACEMENT`), with
  Swedish wording in `errorMessages.ts`.

### Revisit when

Not anticipated — this is now the confirmed, intended rule.

Relevant files:
- `docs/game-modifiers.md` (section 7)
- `src/game/engine/placeTile.ts`, `movePendingTile.ts`, `changeBlankRepresentedLetter.ts`
- `src/game/model/gameError.ts`
- `src/application/game-controller/errorMessages.ts`

## DEC-016 — Replace mode: a word scores only if the move lengthened or created it

**Date:** 2026-08-21
**Status:** ACCEPTED
**Area:** Engine / Rules spec

### Context

`game-modifiers.md` section 7 sent the words affected by a replace through the normal scoring
pipeline unchanged, so swapping one letter inside a committed word re-scored the entire word for
the replacing player. A one-tile move could therefore collect the full value of a long word
somebody else had built, repeatedly, for as long as letters remained that turned it into another
valid word. The project owner reported this after playtesting and specified the intended rule:
a replace should pay only for what it actually adds, not for a word that was already there.

### Decision

A word formed by a move scores only if the move lengthened that word or created it outright. A
word whose span is unchanged — same cells, same length, one letter different — awards nothing.

- The rule is symmetric across directions: replacing the shared "I" of a horizontal "BIL" crossed
  by a vertical "SIL" yields "BAL" and "SAL", and neither scores.
- If the move also lengthens the word, the whole word scores normally, the replaced tile
  included: extending that "BAL" into "BALA" scores all four letters.
- A zero-scoring word is still a word for every other purpose: it must be a dictionary word or be
  accepted by the opponent through the normal proposal flow.
- The all-tiles bonus is unaffected, since it is awarded for emptying the rack rather than for a
  word (`game-rules.md` section 25).

Implemented as: a word scores if at least one of its cells was empty before the move. A move never
empties a cell — it either covers an empty one or swaps the tile in an already-covered one — so
a word covering no previously-empty cell is necessarily the identical span that was already there.
Outside Replace mode every placement covers an empty cell, so the rule is a no-op there.

### Alternatives considered

Scoring only the replacing tile's own letter value for an unchanged word — rejected: it still pays
for a move that adds nothing to the board, just less, and it needs its own separate explanation.

Scoring the difference between the word's new and old value — rejected: it makes the payout depend
on which letter was displaced, is hard to show in a score preview, and can go negative.

Applying the rule only to the line the replace sits in, leaving crossing words to score in full —
rejected by the project owner: the same swap would then pay differently depending on the board's
orientation, and the crossing word did not grow either.

### Rationale

Direct, played-and-confirmed feedback from the project owner, treated as an authoritative
specification correction per this file's process. Replace mode exists to let a player change what
the board says, not to re-collect points for words already standing on it.

### Consequences

- `docs/game-modifiers.md` section 7 gains the scoring rule and the all-tiles-bonus clarification,
  and its multiplier bullet is reworded to apply within a word that does score.
- `WordScore` gains `scoresPoints` (`src/game/model/scoreResult.ts`), so a zero total is
  self-describing; `letterScores` are still reported, letting a UI show what the word would
  otherwise have been worth.
- `scoreWord` derives both this rule and the existing multiplier-activation rule from one
  `coversPreviouslyEmptyCell` predicate, since both turn on the same fact about a placement.
- Scores drop for replace-only moves, which is the intended gameplay change. Nothing about move
  legality, word validation, or the approval flow changes.

### Revisit when

Not anticipated — this is now the confirmed, intended rule.

Relevant files:
- `docs/game-modifiers.md` (section 7)
- `src/game/scoring/scoreMove.ts`, `scoreMove.test.ts`
- `src/game/model/scoreResult.ts`
- `src/game/engine/submitMove.test.ts`
