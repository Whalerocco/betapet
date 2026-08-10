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

No implementation decisions have been recorded yet.

The first real entry should be:

```text
DEC-001
```

Add new entries below this section.

---

<!--
Add real decisions below this line.

Example heading:

## DEC-001 — Decision title

Do not use DEC-000; it is reserved for examples in this document.
-->
