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

## DEC-017 — Swapping your own not-yet-played tiles is ordinary editing, not a replace

**Date:** 2026-08-23
**Status:** ACCEPTED
**Area:** Engine / Rules spec / UI

### Context

`placeTile` rejected any placement whose coordinate was already claimed by the current pending
move, and `movePendingTile` did the same. Dragging a tile onto one of your own tiles placed this
turn therefore failed with "Brickan kan inte placeras där." instead of exchanging the two, in
every game mode. The project owner hit this during the Version 1 mobile test and reported it as a
general bug: having put tiles down but not played them, you could not change your mind by simply
dropping a different tile on one — the only way was to pick the first tile back up.

`game-modifiers.md` section 7 stated the opposite as a deliberate rule ("A replace placement may
only target a *committed* board tile. It cannot target a tile that is part of the current
player's own not-yet-committed pending move"), so the code was following the specification and
the specification was what needed correcting.

### Decision

Dropping a tile onto one of the current player's own not-yet-committed tiles swaps them: the
incoming tile takes the square and the tile that was there returns to the rack. This is ordinary
editing of an unplayed move and is allowed in **every** mode, with or without Replace — the tile
has not been played, nothing leaves the board, and no opponent tile is involved, so it is not a
replace placement and none of Replace mode's restrictions (chaining, must-change-the-letter,
displaced-tile handling) apply to it.

One thing does carry over. A square may already be standing in for a committed tile that an
earlier placement this move displaced; whichever tile ends up on that square inherits that
displacement, so the swap keeps the link to the tile that left the board. A consequence is that
DEC-015 still bites through the swap: exchanging the replacing tile for one showing the displaced
tile's own letter is refused, because that reaches in two steps the no-op replace DEC-015 forbids
in one.

Both routes behave identically — `placeTile` from the rack and `movePendingTile` from the board —
so dragging and the tap flow agree, the lesson from the Replace-mode wiring bug in
`known-bugs.md`.

### Alternatives considered

Allowing the swap only outside Replace mode — rejected: the restriction has nothing to do with
the modifier, and the owner reported the problem in plain games too.

Having two pending tiles exchange *positions* when one is dragged onto the other, rather than one
returning to the rack — rejected: it is a different, unrequested gesture, and "the tile that was
there goes back to your hand" is the same rule as placing from the rack, which keeps one mental
model for both routes.

Treating the swap as a replace and applying the chaining and same-letter rules to it — rejected
by the project owner: those rules exist to stop a player re-collecting value from the committed
board, which cannot happen with a tile that was never played.

### Rationale

Direct, played-and-confirmed feedback from the project owner, treated as an authoritative
specification correction per this file's process. Section 7's bullet was written to keep *replace*
semantics off the player's own pending tiles and banned plain editing along with them; separating
the two restores the editing affordance without weakening any replace rule.

### Consequences

- `docs/game-modifiers.md` section 7's bullet is rewritten to say a swap is not a replace
  placement, and to note the inherited-displacement carry-over.
- `src/game/engine/placeTile.ts` and `movePendingTile.ts` swap instead of rejecting, returning the
  swapped-out tile to the rack and inheriting `replacedTileId` from the square.
- Three tests that asserted the old rejection now assert the swap; new tests cover a plain-mode
  swap, the inherited displacement (including that the displaced tile reaches the rack exactly
  once), and DEC-015 still refusing a same-letter swap.
- Both ways of "putting a tile on that square" swap: dropping one there, and — added right after
  the project owner tried the tap flow and found it inconsistent — tapping the square while a rack
  tile is selected. Tapping a pending tile with *nothing* selected still picks it back up
  (`ui-design.md` section 13); selecting a tile first is what distinguishes the two intents.

### Revisit when

Not anticipated — this is now the confirmed, intended rule.

Relevant files:
- `docs/game-modifiers.md` (section 7)
- `src/game/engine/placeTile.ts`, `movePendingTile.ts`
- `src/game/engine/placeTile.test.ts`, `movePendingTile.test.ts`
- `src/components/game/GameScreen.test.tsx`

## DEC-018 — The all-tiles bonus is earned by emptying your hand, not by placing a rack's worth

**Date:** 2026-08-23
**Status:** ACCEPTED
**Area:** Engine / Rules spec

### Context

`scoreMove` awarded the all-tiles bonus when `placedTiles.length === configuredRackSize`. Without
Replace mode a hand can never exceed the rack size, so that is the same as "played everything you
held". Replace mode breaks the equivalence: a displaced tile joins the *replacing* player's rack
(DEC-008), so a hand can hold more tiles than the configured rack size.

The project owner hit both halves of the resulting oddity during the Version 1 hot-seat test, and
reported it as playing fewer tiles scoring more:

- holding 7 tiles in a 6-tile game and placing 6 paid the 40-point bonus, although a tile was left
  in hand;
- placing all 7 paid nothing, although the hand was emptied.

In the reported game the two moves differed by roughly ten points of word score, so the bonus
turned a 59-point move into an 89-point one for playing one tile fewer.

### Decision

The bonus is earned by putting your whole hand on the board in one word move. Both conditions
must hold:

- the rack is empty after the move, and
- at least a full rack's worth of tiles was placed.

The second is what preserves `game-rules.md` section 25's own example: emptying a *depleted* rack
near the end of a game still does not qualify. The bonus amount continues to come from the
configured rack size, so emptying an eight-tile hand in a seven-tile game pays the seven-tile
bonus rather than the eight-tile one — the hand grew by accident of Replace mode, and the game was
not configured as an eight-tile game.

### Alternatives considered

Leaving it keyed on the placed count — rejected by the project owner: it rewards holding a tile
back, which is exactly backwards, and it is the behaviour that was reported.

Requiring the hand to have been exactly a full rack as well, so an oversized hand never earns the
bonus — rejected: a player who puts eight tiles on the board has done more than one who puts down
seven, and withholding the bonus there repeats the original complaint in a milder form.

Paying a bonus scaled to the number of tiles actually placed — rejected: `game-rules.md` section
25 defines three fixed amounts tied to the configured rack size, and inventing a fourth for a
modifier-inflated hand is a bigger rule change than the problem warrants.

### Rationale

Direct, played-and-confirmed feedback from the project owner, treated as an authoritative
specification correction per this file's process. "Places the complete rack" was always the
intent; the placed-count test was a shortcut that only coincided with it before Replace mode
existed.

### Consequences

- `game-rules.md` section 25 states both conditions and why the second one is needed.
- `game-modifiers.md` section 7 notes the interaction, since Replace mode is what makes a hand
  able to exceed the rack size.
- `scoreMove` takes the number of tiles left in the rack; `submitMove` reads it from the acting
  player (whose rack has already given up the placed tiles), and `previewMoveScore` threads it
  through so the live score badge matches what the move will actually pay.
- Playing more of your hand can never score less than holding one back, which is asserted by a
  test rather than left implied.

### Revisit when

Not anticipated — this is now the confirmed, intended rule.

Relevant files:
- `docs/game-rules.md` (section 25), `docs/game-modifiers.md` (section 7)
- `src/game/scoring/scoreMove.ts`, `scoreMove.test.ts`
- `src/game/scoring/previewMoveScore.ts`
- `src/game/engine/submitMove.ts`

## DEC-019 — No handoff screen after a proposal is accepted

**Date:** 2026-08-24
**Status:** ACCEPTED
**Area:** UI / Local multiplayer

### Context

`local-multiplayer.md` section 19 prescribed an intermediate screen after the reviewer accepts a
proposed move — "Läggningen godkändes. Nu är det Annas tur." with a `Börja tur` button — and
required that the reviewer's rack appear only after pressing it. `ui-design.md` section 28
described the same moment more loosely, saying a confirmation could "appear as a small
history/event message rather than requiring another blocking dialog", so the two documents already
disagreed about whether the screen should block.

The project owner hit it in play and asked for it to go: the text tells the person holding the
device that it is their turn, which they already know, and it costs a tap every time. Illegal mode
makes that every single turn, since every move there goes through approval.

### Decision

Accepting a proposal goes straight into the reviewer's own turn, with no handoff screen.

This is not an exception to the hot-seat privacy rule but a case the rule does not reach. A
handoff screen exists so one player cannot see the other's private information, and it is needed
when the device changes hands. Accepting passes the turn to the reviewer — the person already
holding the device — and the rack then revealed is their own, so there is nobody to hide it from.

Rejection keeps its screen, because control returns to the proposer and the device really does
have to go back. So does every other handoff.

### Alternatives considered

Keeping the screen but with a shorter label — rejected: the tap is the cost, not the wording.

Showing a brief non-blocking confirmation of what was accepted, as `ui-design.md` section 28
suggested — not implemented as part of this change: the committed move already appears in the
history panel with its score, which covers the same ground without new UI.

### Consequences

- `local-multiplayer.md` section 19 states that no confirmation is shown, and why the privacy
  rule does not apply to this transition.
- `LocalSessionMode` loses `HANDOFF_AFTER_ACCEPTANCE`; `ACCEPT_PROPOSED_MOVE` falls through to
  `PLAYING`. `Börja tur` no longer exists anywhere in the UI, so every remaining handoff continues
  with `Fortsätt`.
- Tests that walked through the acceptance handoff now assert its absence, including that the
  reviewer's rack is on screen immediately.

### Revisit when

Not anticipated. If a future variant lets someone other than the reviewer take the next turn, the
privacy argument above stops holding and the screen would have to come back for that case.

Relevant files:
- `docs/local-multiplayer.md` (section 19)
- `src/application/game-controller/localSession.ts`, `localSession.test.ts`
- `src/components/game/GameScreen.test.tsx`, `e2e/unknown-word-accepted.spec.ts`

## DEC-020 — Online backend stack: Neon Postgres with Better Auth

**Date:** 2026-08-26
**Accepted:** 2026-09-09
**Status:** ACCEPTED
**Area:** Online / Tooling

### Context

`tech-stack.md` sections 25-27 named PostgreSQL as the intended database and Supabase as "a
sensible future option", while explicitly requiring that the choice be re-evaluated before
anything depends on it. T24.1 is that re-evaluation. It is needed now because authentication
(T24.2), match persistence (T24.4) and running authoritative actions on a server all wait on it,
while the two tasks that did not — player-safe views (T24.5) and the server-side engine guarantees
(T24.3) — are done.

What this project actually needs from a backend is narrow:

- Postgres-shaped relational data: users, matches, invitations, and later friends and chat
  (`tech-stack.md` section 25).
- Somewhere to store the authoritative serialized game state per match, with a revision for
  optimistic concurrency (T24.4).
- Managed authentication, explicitly not hand-rolled password storage (section 27).
- Somewhere to run the existing TypeScript engine as the authority (section 28). The engine is
  already framework-independent and proven to run outside a browser (T24.3).
- Turn-based updates. Section 29 is explicit that realtime infrastructure need not be elaborate
  and that correct persistent state matters more than latency.

What it does not need, at least for Milestone 5: file storage, edge functions, row-level security
as the primary defence (the server is authoritative and derives player-safe views itself), or
realtime push.

One property of this particular game deserves weight beyond the feature lists: a match is
asynchronous and can sit untouched for days between moves.

### Decision

Neon for Postgres, Better Auth for authentication, and no platform beyond that for
now — the Next.js application talks to Postgres directly and runs the engine server-side.
Realtime, if it is ever wanted, is decided separately when Milestone 7 arrives; polling suits a
turn-based game.

Facts gathered on 2026-08-26, and worth re-checking before anything is signed up for, since both
vendors have changed pricing within the last year:

| | Neon | Supabase |
|---|---|---|
| Free tier | 100 CU-hours/month, 0.5 GB storage per project, up to 100 projects | 500 MB database, 5 GB egress, 50k MAU, 2 active projects |
| Inactivity | Compute scales to zero, resumes automatically on the next query in a few hundred ms | Project **pauses after 7 days**, and must be restored by hand from the dashboard |
| Bundled auth | Neon Auth, 60k MAU | Supabase Auth, 50k MAU |
| First paid step | Usage-based from $0.106/CU-hour, no monthly minimum since December 2025 | $25/month per project |

### Alternatives considered

**Supabase**, the original guess. Its appeal is that one vendor covers database, auth, realtime,
storage and row-level security, so there is less to assemble. Against it: this project needs
almost none of that bundle, and the free tier pauses a project after seven days of inactivity.
For an asynchronous game where a week between moves is ordinary, that is not an edge case — it is
a Tuesday. The workarounds are a heartbeat cron job that exists purely to defeat a billing policy,
or $25/month from the outset. Neither is disqualifying, and if the answer to the budget question
below is "$25/month is fine", Supabase becomes a reasonable choice again, with realtime already
solved for Milestone 7.

**Neon with Auth.js instead of Better Auth.** Rejected on current facts: Auth.js v5 is stable but
entered maintenance mode in early 2026 — security patches only, and its own maintainers now point
new projects at Better Auth. Starting on a library whose authors have moved on is a poor way to
begin.

**Neon Auth rather than Better Auth.** Plausible, and one fewer thing to run. Better Auth is
proposed instead because it keeps user records in our own Postgres alongside the match data, which
keeps identity portable if the database ever moves; Neon Auth ties it to Neon. This is the
weakest preference in the proposal and easily reversed.

**Convex or Firebase.** Rejected: both would replace the relational model the documents have
assumed throughout with a different one, which is a larger change than the problem calls for.

**Self-hosted Postgres on a VPS.** Rejected: cheapest in cash and dearest in attention. Backups,
upgrades and uptime become a single developer's problem, for a game whose entire traffic is two
people at a time.

### Rationale

The deciding factor is not price or features — at this scale both vendors are free — but which
one behaves sensibly when a game is left alone for a week. Neon's compute sleeping and waking by
itself matches an asynchronous game; a project that pauses until someone opens a dashboard does
not.

The rest follows from keeping the surface small. The project's own instruction is to prefer few,
well-understood dependencies, and the engine is deliberately portable. A plain Postgres plus a
library that owns its tables leaves the server doing what the architecture already says it should:
running the engine and writing rows.

### Resolved by the project owner

Answered on 2026-09-09:

1. **Budget — free only.** No monthly cost is acceptable at present. This removes the one route
   past Supabase's seven-day project pause other than a heartbeat cron job, and so settles the
   choice rather than merely leaning it: Neon.
2. **Data residency — EU, recorded as a requirement.** The players are in Sweden. The Neon
   project is created in **Europe (Frankfurt), `aws-eu-central-1`**. This is not a deployment
   detail that can be adjusted later: a Neon project's region is fixed when the project is
   created, so moving means creating a new project and migrating the data.
3. **Realtime — not needed.** Polling is acceptable for the foreseeable future. This changes
   nothing structurally, because `online-multiplayer.md` sections 29 and 31 already forbid making
   correctness depend on a live connection and already require a match revision; refetching a
   match must recover authoritative state whether or not a socket exists. Realtime stays where the
   roadmap put it, as the optional T30.2 in Milestone 7.2.
4. **Hosting — decided separately and immediately, as DEC-021:** Vercel Hobby, functions pinned to
   Frankfurt so the application sits beside its database.

### Consequences

- `tech-stack.md` sections 25-27 name the chosen stack rather than a candidate; section 29 records
  that polling is the chosen approach for now.
- T24.1 is complete. T24.2 (authentication) and T24.4 (match persistence) are unblocked.
- A first schema is designed: users, matches, match players, and the serialized state with a
  revision column for the optimistic concurrency T24.4 requires.
- The database access layer — an ORM or a plain driver — is **not** settled by this entry. It is a
  major dependency in its own right and needs its own decision before code is written.
- The engine keeps knowing only `playerId` (`tech-stack.md` section 27). Better Auth owns identity;
  nothing about sessions or tokens reaches `src/game`.

### Revisit when

The pricing and inactivity behaviour above were checked on 2026-08-26 and again on 2026-09-09;
both vendors have moved within the last year, so re-check before relying on any specific number.
Also revisit if realtime becomes a requirement earlier than Milestone 7, or if the free tier's
storage ceiling comes into view — unlikely, since a serialized game is a few kilobytes.

Relevant files:
- `docs/tech-stack.md` (sections 25-31)
- `docs/online-multiplayer.md`
- `docs/tasks.md` (T24.1)

---

## DEC-021 — Host the application on Vercel, in the Frankfurt region

**Date:** 2026-09-09
**Status:** ACCEPTED
**Area:** Online / Tooling

### Context

`tech-stack.md` section 31 has never named a hosting platform. It asked only that the application
stay deployable as a standard Next.js application, that hosting-specific code be avoided, and that
a platform be chosen once a first playable version existed. That version exists, and DEC-020's
fourth open question deferred hosting to here.

The constraints are the ones the project owner set alongside DEC-020: no monthly cost, and the
data in the EU.

One constraint is specific to a serverless deployment: a function pays the network round trip to
its database on every query. With the database fixed in Frankfurt by DEC-020, putting the
application anywhere else is a self-inflicted latency cost on every request.

### Decision

**Vercel, Hobby plan, with functions pinned to Frankfurt (`fra1`).**

Facts as checked on 2026-09-09, worth re-checking before relying on them:

- The Hobby tier includes 100 GB fast data transfer, 1M edge requests, 1M function invocations,
  and 6,000 build minutes per month.
- Hobby is restricted by Vercel's terms to **personal, non-commercial use**. A Betapet played by
  friends is within that. Adding advertising, payments or a paid tier would not be, and would mean
  moving to a paid plan.
- Hobby accounts cannot buy overage. Exceeding a limit pauses the resource until the monthly
  window rolls over, rather than producing a bill.

### Alternatives considered

**Cloudflare Workers via the OpenNext adapter.** A more generous free allowance (100k requests per
day), but the free plan caps a Worker at 3 MiB and 10 ms of CPU per request. A Next.js application
carrying the engine and a Swedish dictionary is an awkward fit for both. It also runs at the edge
by design, which makes "the application runs in the EU" harder to assert rather than easier.

**Netlify's free tier.** Workable and broadly comparable, but less native to Next.js, with no
advantage here that offsets that.

**A small VPS (~€4/month).** Rejected on the same grounds DEC-020 rejected self-hosted Postgres:
cheapest in cash, dearest in attention. It is, however, the option that would provide long-lived
WebSocket connections, so it returns to the table if the realtime answer ever changes.

### Rationale

Vercel is the platform Next.js is built for, which serves section 31's actual requirement — that
no hosting-specific code be needed. Frankfurt is chosen not for its own sake but to sit beside the
Neon project DEC-020 fixed there.

The non-commercial clause is recorded here deliberately. It is not a limitation today, but it is
the kind of term that is discovered at the worst moment, and it converts "should Betapet ever earn
money" from a technical question into a billing one.

### Consequences

- `tech-stack.md` section 31 names Vercel and Frankfurt.
- Deployment configuration is added when there is a server to deploy — no Vercel-specific code or
  configuration is added by this entry.
- The region for functions must be set explicitly; Vercel's default is not Frankfurt.
- If Betapet is ever monetised, the hosting plan must be revisited before that happens.

**Update, as deployed (2026-09-10):** the configuration this entry deferred now exists, and the
application is live at `https://betapet.vercel.app`. It came to two files — `vercel.json` pinning
`regions: ["fra1"]`, and `.vercelignore` — plus three project environment variables; the facts
above were re-checked and still held. Details in `tech-stack.md` section 31.

The Frankfurt pinning is confirmed rather than assumed: production responses carry
`x-vercel-id: arn1::fra1::…`, so the function executes in Frankfurt even though the request is
accepted at the Stockholm edge.

One thing this entry did not anticipate: Vercel's CLI reads `.vercelignore` instead of
`.gitignore`, so the first deploy tried to upload the 1.6 GB of raw dictionary sources that
`.gitignore` already excludes, and failed. Ignore rules for large local-only data now have to be
maintained in both files.

### Revisit when

Betapet acquires any commercial aspect; a free-tier limit is reached repeatedly; or realtime push
becomes a requirement, since the serverless model does not hold long-lived sockets.

Relevant files:
- `docs/tech-stack.md` (section 31)
- `docs/decisions.md` (DEC-020)

---

## DEC-022 — Drizzle ORM, over Neon's WebSocket driver

**Date:** 2026-09-09
**Status:** ACCEPTED
**Area:** Online / Tooling

### Context

DEC-020 chose Neon Postgres and Better Auth but deliberately left open how the application talks
to the database. That is a separate major dependency: Better Auth needs a database adapter, and
T24.4's match persistence will use the same layer, so both are committed to whatever is chosen
here.

### Decision

**Drizzle ORM**, with `drizzle-kit` for migrations, connecting through
**`@neondatabase/serverless`'s WebSocket driver**.

The driver deserves attention, because the obvious choice is the wrong one. Neon offers an HTTP
driver that is lighter and is the usual serverless default, and a WebSocket driver that is
heavier. The HTTP driver cannot hold a transaction open across statements. T24.4 requires
transactional updates, and it is right to: committing a move writes an authoritative game state
and bumps the match revision that guards against a stale second submission, and a state written
without its revision bumped is a corrupt match. The WebSocket driver is chosen for that reason
alone.

### Alternatives considered

**Prisma.** More mature and pleasant, but it generates a client and carries a heavier runtime,
which is felt exactly where this application runs — serverless functions that cold-start. Its
schema also lives in Prisma's own DSL rather than in TypeScript, which would put the shape of the
data slightly outside the language the rest of the project is written in.

**No ORM: `postgres.js` with Better Auth's built-in Kysely adapter.** The fewest dependencies, and
Better Auth can emit a plain `.sql` file for its own tables. Rejected because everything Drizzle
provides would then be written by hand — migrations, types over query results, and the mapping
between the two — for a schema that will grow through matches, invitations, friends and chat.

**Neon's HTTP driver.** Rejected on transactions, as above. It would be the better choice if the
data were only ever read.

### Rationale

Drizzle's schema is TypeScript, so the database shape is checked by the same compiler as the rest
of the project, and its query builder stays close to SQL rather than hiding it. It adds no
generated client and little runtime weight. Better Auth generates its own tables directly in
Drizzle form, so the authentication schema and the application schema are one artifact rather than
two that must be kept in step by hand.

### Consequences

- Added: `drizzle-orm`, `@neondatabase/serverless`, and `drizzle-kit` and `@better-auth/cli` as
  development dependencies. `@better-auth/cli` pulls in `better-sqlite3`, a native module it does
  not need here; it is kept as a pinned development dependency anyway, because it owns a generated
  file in the repository and generating that file with a floating `npx` version would eventually
  produce a schema that does not match the installed `better-auth`.
- `src/server/db/schema/auth.ts` is generated by `npm run auth:generate` and must not be
  hand-edited. The CLI insists on a module that exports a built `auth` instance, which the
  application deliberately does not have, so `scripts/better-auth-config.ts` exists for the
  generator alone and is never imported by the application. `npm run db:generate` turns a schema change into a migration in `drizzle/`, and
  `npm run db:migrate` applies it.
- The connection is opened on first use rather than when the module loads. Better Auth inspects
  the Drizzle instance while being configured, so an eager connection made `next build` fail on
  any machine without a database — including the hot-seat `playtest` build, which needs none.
  `getAuth()` and the `db` proxy in `src/server/db/client.ts` exist for that reason, and
  `src/server/auth.test.ts` holds the regression test.
- Server code lives under `src/server/`, and the engine's ESLint boundary now forbids importing it
  alongside React, Next, components and the application layer.

### Revisit when

The transaction requirement changes (the HTTP driver becomes viable if it ever does), or the
schema grows complex enough that hand-written migrations become a burden Drizzle does not ease.

Relevant files:
- `src/server/db/client.ts`, `src/server/db/schema/`, `src/server/auth.ts`
- `drizzle.config.ts`, `drizzle/`, `scripts/better-auth-config.ts`
- `docs/decisions.md` (DEC-020)

---

## DEC-023 — Match persistence: one JSONB state, guarded by a compare-and-set revision

**Date:** 2026-09-09
**Status:** ACCEPTED
**Area:** Online / Persistence

### Context

T24.4 asks for four things: the authoritative serialized game state persisted, a match revision,
match metadata, and transactional updates. `online-multiplayer.md` sections 31-35 describe what
they are for but leave the schema and the mechanism to the implementation phase. Several choices
inside that were not dictated by the documents.

### Decision

**The game state is one `jsonb` column, not a set of relational columns.** Section 34 asks for
this directly and warns against duplicating engine fields into columns no query needs. The engine
already turns a state into text and back through `serializeGameState`/`parseGameState` (T24.3), so
the row and the engine agree on what a valid game is without either restating the other.

**A write is a single conditional UPDATE, not a read followed by a write.** The state, the
revision, the match status and whose turn it is next all move in one statement whose `WHERE`
clause names the revision the caller expected. This is what section 35 means by treating the
engine's resulting state as one authoritative transition, and it is stronger than a transaction
around a read-then-write, which would still race. It also makes section 32's double-submit
harmless for free: the second write matches no row and changes nothing, rather than needing a
separate idempotency check.

**Two columns are derived from the state, never taken from the caller:** whose turn it is
(`current_actor_user_id`) and the match's status. Both exist so the match list can be drawn
without deserializing every game (section 14). A caller that could set them could also let them
drift from the game they describe, and a match list that lies about whose turn it is would be a
bug nobody notices until a player is waiting for a turn they already have.

**Authorization is folded into the queries rather than being a step before them.** Every function
that reaches a match takes the acting user, and participation is part of the `WHERE` clause. A
non-participant gets "not found" rather than a refusal, so an id cannot be used to discover which
matches exist — sections 37 and 38, expressed in a way a caller cannot forget.

### Alternatives considered

**Columns for the engine's fields** (scores, current player, board). Rejected: it duplicates the
engine's model in SQL, and every rule change would then need a migration.

**A `SELECT ... FOR UPDATE` then a write, inside a transaction.** Correct, but it holds a row lock
for the duration and needs the caller to remember the pattern. The compare-and-set is one
statement and cannot be got wrong.

**A separate idempotency/action-id table** (section 32 mentions request IDs as an option).
Rejected for now: the revision already makes a repeated submit a no-op. An action id becomes
worth its weight if a client ever needs to distinguish "my write landed" from "someone else's
did", which the current outcomes already report.

**Storing the built `GameConfiguration`.** Rejected: it carries a whole board definition and a
`Set`, neither of which belongs in a column. The match stores the *selection* a player made —
configuration id, rack size, modifiers, Polyglot and Wild languages — which is what section 49
requires to keep a match playing by the rules it started with.

### Consequences

- Tables `match` and `match_player` (`drizzle/0001_matches.sql`, applied). `match_player` is where
  `online-multiplayer.md` section 8's User-versus-Player distinction lives: it maps an account to
  a seat, and every authorization check leans on it.
- `saveGameState` reports `SAVED`, `STALE_REVISION`, `NOT_FOUND` or `INVALID_STATE` rather than
  throwing. A stale revision is an ordinary outcome of two tabs, not an exception.
- `MatchConfiguration` in `src/server/db/schema/match.ts` deliberately mirrors `SavedLocalGame` in
  `src/application/persistence/localGameStorage.ts`. The two stores should share one type once
  T25 builds match creation and both can be changed together; today they are duplicated field
  names, which is a small debt recorded here rather than left silent.
- The tests run against a real database and skip when none is configured. The guarantees at stake
  — atomicity, a rejected stale write, a match a stranger cannot read — are properties of
  Postgres, and a mock would assert only that the mock behaves as written.

### Revisit when

A query needs a field that only exists inside the JSON (the fix is a derived column, written the
same way `current_actor_user_id` is), or a client needs to tell its own write apart from an
opponent's, which is where an action id would earn its place.

Relevant files:
- `src/server/db/schema/match.ts`, `src/server/matches.ts`, `src/server/matches.test.ts`
- `drizzle/0001_matches.sql`
- `docs/online-multiplayer.md` (sections 31-38, 49)

---

## DEC-024 — The server action API: session-derived identity, replayed placements

**Date:** 2026-09-09
**Status:** ACCEPTED
**Area:** Online / API

### Context

Milestone 5.1 moves authoritative gameplay onto the server: a client asks for a move to be made
rather than writing a state. `online-multiplayer.md` section 36 names the actions and section 5
gives the pipeline — authenticate, authorize, load, run the engine, persist, return a player-safe
view. Several things inside that were left open.

### Decision

**A request never carries a `playerId`.** Which player the caller is comes from the session and
the match's seats. Section 37's example is that August must not be able to accept his own proposal
as Anna; the way to guarantee that is not to check the id a client sends, but never to read one.
The action types the API accepts have no such field, so the check cannot be forgotten and there is
nothing to spoof.

**A submitted move carries placements, and the server replays them.** Section 19 recommends
keeping ordinary tile arranging on the player's own device and sending the finished placement, and
adds that the server must then independently validate tile ownership and placement. It does that
by dispatching each placement through the same `placeTile` the local game uses, against the
authoritative state, before submitting. A tile the player does not hold is refused by the engine,
not by a check written a second time for the server.

**The server runs `dispatchGameAction`, the application layer's existing entry point, rather than
calling engine functions directly.** Online and hot-seat play then cannot drift apart: there is
one place where an action becomes a state, and it already existed.

**Nothing is written unless the engine produced it.** The engine runs against an in-memory state
and only its output is persisted, so a rejected action leaves the row untouched — no rollback
needed, because nothing was written to roll back.

**An opponent is found by email.** It is the only identifier an account has today. Friends and
user search are Milestone 7, and this is meant to be replaced by them rather than to stand.

**Rebuilt configuration, not stored configuration.** A match stores the rules selection (DEC-023),
and the board definition and dictionaries are rebuilt from code on each server process. A match
that carried its own copy of them would keep playing by a snapshot of the code. The rebuild is
memoized per distinct selection, since the dictionaries are megabytes (DEC-011) and one process
serves many matches.

### Alternatives considered

**Persisting each tile placement as it happens** (section 19's Option B). Rejected as the
document itself recommends: more writes, more concurrency, and the only gain is resuming an
unfinished arrangement on another device.

**A REST verb per action** (`/pass`, `/exchange`, `/move`). Rejected in favour of one `actions`
endpoint taking a typed action, which is closer to section 36's "domain actions" and mirrors the
`GameAction` union the controller already dispatches. Invitation accept and decline stay separate
endpoints, because they act on the match rather than inside the game.

**Returning the full state to the acting player.** Rejected: `toPlayerGameView` exists (T24.5), and
the acting player has no more right to the tile bag's order than the waiting one.

### Consequences

- A 404 covers both "no such match" and "not your match" (section 38: an id is not
  authorization). A 409 is a stale revision or a match in the wrong status, and a 422 is the
  engine refusing a move — the last of which means the client's request was well-formed and the
  rules said no.
- `createGame` now accepts optional seat ids. An online match maps accounts to seats before a game
  exists, so the ids are recorded at invitation time and handed to the engine when the game starts,
  rather than generated and reconciled afterwards. Local play still omits them.
- Declining an invitation cancels the match rather than deleting it, since section 15 has a status
  for exactly that and the inviter should see what became of it.
- No screens. The routes are usable with any HTTP client; Milestone 6 is where the interface for
  them lands.

### Revisit when

Friends arrive and email lookup should give way to user search; or resignation and time limits
(sections 45-46) need actions that end a game without a move.

Relevant files:
- `src/server/matchActions.ts`, `src/server/requests.ts`, `src/server/http.ts`, `src/server/session.ts`
- `src/app/api/matches/**`
- `docs/online-multiplayer.md` (sections 5, 19, 31-38)

---

## DEC-025 — A match is waiting on the turn state, not on the current player

**Date:** 2026-09-09
**Status:** ACCEPTED
**Area:** Online / Persistence

### Context

DEC-023 gave the match table a derived `current_actor_user_id` so the match list could be drawn
from columns rather than by deserializing every game. It was derived from `GameState.currentPlayerId`.

Building the match list's sections (T27.1) showed that to be wrong. `confirmProposal` leaves
`currentPlayerId` as the proposer and moves only the turn state to
`WAITING_FOR_OPPONENT_APPROVAL`. So while a proposed word awaited review, the column named the
proposer — and the list would have told the reviewer she was waiting for her opponent while her
opponent waited for her. A match could sit in both players' "waiting" piles until somebody
guessed.

The defect was in the derivation, not in the engine: `currentPlayerId` means what it says, and the
engine is right to leave it alone while a proposal is outstanding. Nothing had been built on the
column yet, so nothing had gone wrong in play.

### Decision

The column is derived from `state.turnState`, which is the field that actually says what the game
is waiting for:

| Turn state | Waiting on | Doing what |
|---|---|---|
| `PLAYER_TURN` | that player | `PLAY` |
| `REQUIRES_PLAYER_CONFIRMATION` | that player | `PLAY` |
| `WAITING_FOR_OPPONENT_APPROVAL` | the **reviewer** | `REVIEW` |
| `FINISHED` | nobody | — |

A second derived column, `pending_action`, records which of the two it is, because the match list
shows them as different sections: `Din tur` against `Ord att granska` (T27.1). Both columns are
written by the server from the state, never supplied by a caller, as DEC-023 requires.

An unconfirmed proposal stays with its proposer and counts as `PLAY`: their move is unfinished
until they say `Spela ändå` or withdraw it, and it is nobody else's business yet
(`online-multiplayer.md` section 21).

### Alternatives considered

**Deserializing each game to build the list.** Correct and obviously wasteful — a list needs a
status and a name, not a board. DEC-023 rejected it and this does not change that.

**Computing the category in the client from the state.** Would mean sending every match's full
state to draw a list, which is both wasteful and a leak.

**Keeping one column and inferring the action from the match status.** The status is the wrapper's
(INVITED/ACTIVE/FINISHED/CANCELLED) and knows nothing about proposals, so it cannot tell a move
apart from a verdict.

### Consequences

- Migration `drizzle/0002_match_pending_action.sql`, applied.
- `listMatchesForUser` returns a per-viewer category rather than a boolean: the same match is in
  different piles for the two players.
- A test confirms that a confirmed proposal appears as `AWAITING_YOUR_REVIEW` for the reviewer and
  `WAITING_FOR_OPPONENT` for the proposer — the case that was wrong.

### Revisit when

A future turn state is added; it must be given a place in the table above rather than falling
through to a default, which is why the derivation switches exhaustively over the turn state's kind.

Relevant files:
- `src/server/matches.ts` (`waitingOn`, `listMatchesForUser`)
- `src/server/db/schema/match.ts`
- `docs/decisions.md` (DEC-023)

---

## DEC-026 — The online interface renders a view, and arranges tiles without the engine

**Date:** 2026-09-09
**Status:** ACCEPTED
**Area:** Online / UI

### Context

Milestone 6 needs screens: signing in, a match list, and playing a match against the server. The
hot-seat screen could not simply be pointed at an online match, because it is built around holding
a `GameState` and dispatching actions into the engine locally. An online client holds a
`PlayerGameView` — no opponent rack, no bag — and could not run the engine even if it wanted to.

`tasks.md` had no entries for any of this while `roadmap.md` section 33 required it; the gap was
raised with the project owner, who chose to build the interface in full.

### Decision

**A separate screen for online play, sharing every presentational component with the local one.**
`OnlineGameScreen` renders from a `PlayerGameView`; `GameScreen` keeps rendering from `GameState`.
Board, Rack, ScoreBoard, TurnActions, OpponentReview, UnknownWordNotice, BlankLetterPicker,
GameHistory and GameOverScreen are used unchanged by both, because they were already written
against plain data — a board, some tiles, a rack — rather than against engine state. The two games
therefore look identical while disagreeing entirely about who decides the rules.

**Arranging tiles is local and unjudged.** The online client cannot ask the engine whether a
placement is legal, so it does not try: it tracks where tiles have been put, refuses only what it
can see for itself (an occupied square), and sends the finished placement. The server replays it
through the engine and answers. This is `online-multiplayer.md` section 19's recommendation, and
the consequence is deliberate — an illegal move is refused after `Spela`, not prevented before it.

**One place owns the wire format.** `matchApi.ts` wraps every endpoint and returns either a value
or a named failure; `failureMessages.ts` turns a failure into Swedish. A rejected rule defers to
`describeGameError`, so an online player and a hot-seat player are told the same thing in the same
words when the engine refuses the same move.

**The open match polls every 15 seconds** (DEC-020 chose polling). A poll never overwrites an
error the player has not read, and a response that arrives after the screen has moved on is
discarded.

### Alternatives considered

**Making `GameScreen` accept either shape.** Rejected: every branch inside it would have to ask
which game it was in, and the privacy rule — that this client must never hold the opponent's rack
— would become a property of careful branching rather than of the type it receives.

**Sending each placement to the server as it happens** (section 19's Option B). Rejected as the
document recommends: more requests and more concurrency, to gain resuming an unfinished
arrangement on another device.

**Running the engine client-side against a synthetic state.** Would give a live score preview and
instant validation, at the cost of inventing a fake bag and a fake opponent rack for the engine to
chew on. A client that models what it is not allowed to know is a bad foundation.

### Consequences

- Known differences from the hot-seat game, all of them consequences of the client not holding the
  game: no drag-and-drop (tap a tile, tap a square), and no live score preview while arranging —
  the score appears with the proposal or the committed move, from the server.
- `TurnActions` gained a `showEndGame` prop. Ending a game early online is resignation, which is a
  match-level action nobody has built (`online-multiplayer.md` section 46), and a permanently
  disabled button is worse than no button.
- `/online` is reachable from the start screen by a link, and by nothing else. Hot-seat play still
  needs no account and asks for nothing.
- Verified by playing a real match through the browser against the Frankfurt database: two
  accounts created, an invitation sent, accepted from the other account, and DUM played across the
  centre for 14 points, with the rack refilled and the turn handed over. The test accounts were
  removed afterwards.

### Revisit when

Drag-and-drop or a live score preview is wanted online. Both need the client to answer questions
it currently cannot, and the honest way to get them is a server-side preview endpoint rather than
a client-side engine.

Relevant files:
- `src/components/online/`, `src/app/online/page.tsx`
- `src/application/online/matchApi.ts`, `src/application/online/failureMessages.ts`
- `src/application/auth/authClient.ts`

---

## DEC-027 — A user is found by a unique handle, not by email or name

**Date:** 2026-09-10
**Status:** ACCEPTED
**Area:** Online / Identity

### Context

`online-multiplayer.md` section 10 lists what identity the game needs — find friends, identify
opponents, display match ownership, send invitations — but never says what a user is *found by*.
T28.1 asks for user discovery "using the chosen identity/search model" without a model having been
chosen anywhere, and adds that it must avoid exposing unnecessary personal data.

Until now an opponent was found by exact email address (T25.1). That works, but it means playing
Betapet with somebody requires knowing their email address, and it makes the address the thing
people pass around.

### Decision

**Every account has a `handle`: unique, chosen at sign-up, and the only way to find a user.**

The rules are in `src/server/handles.ts`: 3 to 20 characters, lowercase `a-z`, digits and `_`, and
a letter first. The handle is stored normalized — `@Anna`, `anna ` and `ANNA` are one handle — and
displayed with a leading `@` that is decoration rather than part of the value.

Three consequences of "the only way" are deliberate:

- There is **no user search endpoint**. A handle is resolved by sending a friend request to it, so
  a caller learns the name behind a handle it already knew, and learns nothing about one it did
  not. Nothing in the API returns a list of users.
- A handle that does not exist and a request that failed look the same from outside.
- An email address is never returned to a client. It remains how a non-friend is invited, because
  knowing an address is itself the permission to invite its owner.

The project owner chose this over exact-email-only search and display-name search, having been
shown all three.

### Alternatives considered

**Exact email address only.** Already built, no schema change, and no enumeration surface. Rejected
because it makes a private address the thing friends must exchange, and there is no way to invite
somebody without it.

**Search by display name.** The easiest to use with no prior knowledge, and rejected for exactly
that reason: it publishes the user list to anyone signed in. Names are not unique either, so two
people called Anna are indistinguishable and a request can go to the wrong one — which is worse
than a failed search.

### Rationale

A handle is the only one of the three that is *deliberately published by its owner*. It carries
nothing they did not choose to share, it can be read aloud or texted, and it does not require the
sender to hold anything private about the recipient.

The character rules exist for the person typing it in, not for the game's language: lowercase so
case cannot be got wrong, ASCII so no keyboard layout can fail to produce it (which is why å, ä
and ö are excluded from handles while remaining central to the game itself), and a letter first so
a handle can never be mistaken for an id.

### Consequences

- `user.handle` is declared through Better Auth's `additionalFields`, so it lives on its `user`
  table and sign-up accepts it. `unique` is what makes it an address: the database, not the
  application, settles a race between two people claiming one.
- Normalization and validation happen in Better Auth's `databaseHooks.user.create.before`, which is
  the only path that creates a user. An illegal handle is refused as `INVALID_HANDLE`.
- Existing accounts predate the column. Migration `0003` adds it nullable, derives a handle for
  every existing row, then sets `NOT NULL` — a generated one where the derivation would be illegal
  or collide.
- **Changing a handle is not built.** A handle is therefore permanent, including a derived one.
  That is acceptable while the accounts are a handful of friends' and is the first thing to build
  if it stops being.
- The interface never normalizes a handle itself; it sends what was typed. One place decides what
  a handle is.

### Revisit when

Somebody wants to change their handle, or when finding people needs to work without exchanging
anything at all — at which point the question is a real search feature, with the enumeration
problem this entry avoided.

Relevant files:
- `src/server/handles.ts`, `src/server/auth.ts`
- `drizzle/0003_handles_and_friendships.sql`
- `src/application/auth/authClient.ts`, `src/components/online/SignInScreen.tsx`

---

## DEC-028 — One friendship row per pair, ordered by the database

**Date:** 2026-09-10
**Status:** ACCEPTED
**Area:** Online / Data model

### Context

`online-multiplayer.md` section 11 sketches a friendship as `requesterUserId`, `recipientUserId`
and a status from `PENDING`, `ACCEPTED`, `DECLINED`, `BLOCKED`, and says explicitly that "the exact
social model should be designed when this phase begins". This is that design. Milestone 7 asks for
five things: find a user, send a request, accept or decline, list friends, and start a match with a
friend.

The awkward part of any friendship model is that a request is directed while a friendship is not,
and that two people can send each other the mirror-image request at the same moment.

### Decision

**One row per pair, in whichever direction the first request went, with the pair enforced unordered
by the database.**

- The row keeps `requesterUserId` and `addresseeUserId`, because a `PENDING` request is genuinely
  directed: only the addressee may answer it. Once `ACCEPTED`, the direction stops meaning
  anything, and every read treats the pair as unordered.
- A unique index on `(least(requester, addressee), greatest(requester, addressee))` makes "August
  and Anna" and "Anna and August" the same key, so two rows for one pair cannot exist — including
  under a simultaneous double request.
- A check constraint forbids befriending oneself, so no code path can write that row.
- **A request that crosses one coming the other way is an acceptance.** Both people have asked for
  the same thing; leaving them each waiting for the other would be an absurdity the interface could
  not explain.
- `DECLINED` is kept rather than deleted, so a declined request stops being pending for both sides
  without the requester being told whether it was refused or merely unanswered. A later request
  between the same two people reuses the row, in the direction it is then sent.
- **`BLOCKED` is not implemented.** It is a moderation feature with rules of its own — what a
  blocked user may still see, whether they are told, what happens to a match in progress — and
  Milestone 7 asks for none of them. The enum value is deliberately absent rather than present and
  unhonoured.

### Alternatives considered

**Two mirrored rows per friendship.** Reads become trivial (`where user_id = me`), and every write
becomes two, with no way for the database to keep them consistent. Rejected: it trades one honest
`CASE` in a query for a class of bug where half a friendship exists.

**Deleting a declined row.** Simpler, and it lets the same request be re-sent immediately and
repeatedly. Keeping the row costs nothing and leaves a record of the answer.

**Storing a canonical `userAId`/`userBId` pair plus `requestedBy`.** Equivalent in power, but it
renames both columns away from what section 11 wrote and buries the direction in a third column.

### Rationale

Where a rule can be enforced by the database, it is: the pair's uniqueness and the self-friendship
ban are both constraints rather than checks in application code, so nothing can be written that
violates them regardless of which path writes it. Where the rule is genuinely about intent — who
may accept — it is folded into the `where` clause of the update, in the same style as `matches.ts`,
so an id alone is never enough to answer somebody else's request.

Answering a request addressed to somebody else returns `NOT_FOUND` rather than a refusal, for the
reason section 38 gives: any other answer confirms the request exists.

### Consequences

- `friendship` table, `friendship_status` enum, and `src/server/friends.ts` with the four
  operations the milestone needs. Nothing in it imports the engine.
- `listSocialGraph` is one query: the other user is whichever end of the row this user is not, and
  friends, incoming and outgoing come out of a single pass.
- Removing a friend is not built — the milestone does not ask for it, and a friendship has no
  effect other than allowing an invitation.
- `createMatch` accepts an opponent named by id only when the two are friends, which is what makes
  T28.3's "start a match from the friend list" safe without exposing addresses.

### Revisit when

Blocking is wanted, or unfriending, or a friendship starts carrying privileges beyond invitation —
each of which is a question this entry deliberately left open.

Relevant files:
- `src/server/db/schema/friendship.ts`, `src/server/friends.ts`
- `src/app/api/friends/`, `src/components/online/FriendsScreen.tsx`
