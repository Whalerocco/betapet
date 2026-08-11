# Disputed Word Example

## 1. Purpose

This example shows the complete lifecycle of a move containing one or more words that are not found in the Swedish dictionary but are not explicitly forbidden.

This is the defining custom mechanic of the game.

Use this example together with:

- `game-rules.md`
- `game-engine.md`
- `dictionary.md`
- `content-model.md`
- `ui-design.md`
- `local-multiplayer.md`
- `game-state-example.md`
- `normal-move-example.md`

If this example conflicts with a specification file, the specification file takes precedence.

---

## 2. Core rule demonstrated

A word that is not in the dictionary may still be played if:

1. The word is not explicitly forbidden.
2. The proposing player confirms that they want to attempt the move.
3. The opponent accepts the complete move.

If the opponent rejects the move:

- No points are awarded.
- No replacement tiles are drawn.
- The turn does not pass to the opponent.
- The proposing player gets control back.
- The newly placed tiles remain on the board as editable pending tiles.
- The proposing player may rearrange or remove them and try again.

If the opponent accepts the move:

- The entire move is committed.
- Normal scoring applies.
- Accepted unknown words become accepted vocabulary for that game.
- Those accepted words do not require another challenge later in the same game.

---

# 3. Scenario

Assume:

- August and Anna are playing locally.
- It is August's turn.
- August creates the word `GRÖMP`.
- `GRÖMP` is not present in the configured Swedish dictionary.
- `GRÖMP` is not a forbidden proper name, place name, disallowed abbreviation, or another explicitly forbidden form.
- The placement itself is physically legal.
- The move would score 18 points if committed.

`GRÖMP` is intentionally used as an artificial example.

It must not be added to the global dictionary simply because it appears in this document.

---

# 4. Starting state

Conceptually:

```text
Game status:
    ACTIVE

Current player:
    August

Turn state:
    PLAYER_TURN(player-1)

Pending move:
    none

August score:
    74

Anna score:
    68

Accepted vocabulary:
    empty
```

The local session has completed the handoff to August.

August's rack is visible.

Anna's rack is hidden.

---

# 5. August places tiles

August places tiles that form:

```text
GRÖMP
```

The tiles are pending.

Conceptually:

```json
{
  "pendingMove": {
    "playerId": "player-1",
    "status": "EDITING",
    "placedTiles": [
      { "tileId": "tile-G", "coordinate": { "row": 8, "column": 5 } },
      { "tileId": "tile-R", "coordinate": { "row": 8, "column": 6 } },
      { "tileId": "tile-O-BLANK", "coordinate": { "row": 8, "column": 7 }, "representedLetter": "Ö" },
      { "tileId": "tile-M", "coordinate": { "row": 8, "column": 8 } },
      { "tileId": "tile-P", "coordinate": { "row": 8, "column": 9 } }
    ]
  }
}
```

The exact physical tiles and coordinates are illustrative.

---

# 6. Blank example

Suppose `Ö` is represented by a blank tile.

The physical tile has:

```text
letter = null
isBlank = true
points = 0
```

The pending placement has:

```text
representedLetter = "Ö"
```

Word construction therefore sees:

```text
GRÖMP
```

Scoring still gives the blank zero base points.

---

# 7. August selects Spela

August selects:

```text
Spela
```

The application requests submission.

Conceptually:

```json
{
  "type": "SUBMIT_MOVE",
  "playerId": "player-1"
}
```

The UI does not decide whether `GRÖMP` is legal.

---

# 8. Physical validation

The engine first validates the placement.

For this example:

```text
Correct player's turn:
    yes

Tiles belong to August:
    yes

All pending tiles aligned:
    yes

No illegal gaps:
    yes

Placement connected legally:
    yes

No collision:
    yes
```

Result:

```text
physical validity = VALID
```

Only then does word validation matter.

---

# 9. Word detection

The engine constructs the resulting board and identifies all newly formed words.

For the simple example:

```text
GRÖMP
```

Suppose no crossing words are formed.

---

# 10. Normalization

The word-validation system normalizes the word according to `dictionary.md`.

Conceptually:

```text
"GRÖMP"
    ↓
normalize
    ↓
"GRÖMP"
```

Swedish letters such as:

```text
Å Ä Ö
```

must be preserved correctly.

---

# 11. Dictionary lookup

The validator checks the global Swedish dictionary.

Result:

```text
not found
```

It then checks whether the word is already accepted for this particular game.

Result:

```text
not accepted
```

It checks explicit forbidden-word rules.

Result:

```text
not forbidden
```

Therefore:

```text
UNKNOWN_WORD
```

---

# 12. Validation result

Conceptually:

```json
{
  "physicalValidity": "VALID",
  "formedWords": [
    {
      "word": "GRÖMP",
      "normalizedWord": "GRÖMP"
    }
  ],
  "wordResults": [
    {
      "word": "GRÖMP",
      "normalizedWord": "GRÖMP",
      "status": "UNKNOWN_WORD"
    }
  ],
  "requiresApproval": true
}
```

---

# 13. Score preview

The engine calculates what the move would score if accepted.

For this example:

```text
18 points
```

This is provisional.

August's authoritative score remains:

```text
74
```

The score must not be applied yet.

---

# 14. Proposing-player confirmation

The pending move enters a state conceptually like:

```text
REQUIRES_PLAYER_CONFIRMATION
```

The UI shows:

```text
"GRÖMP" finns inte i ordlistan.

Vill du spela läggningen ändå?

18 poäng om läggningen godkänns.

[ Ändra ]   [ Spela ändå ]
```

This decision belongs to August.

Anna has not yet been asked anything.

---

# 15. Branch A: August chooses Ändra

If August selects:

```text
Ändra
```

the move returns to normal editing.

Conceptually:

```text
pendingMove.status = EDITING
```

The placed tiles remain pending.

August may:

- Move them
- Remove them
- Change the blank's represented letter
- Add/remove other tiles where legal
- Submit another placement

There is no handoff.

There is no history event claiming the opponent rejected anything.

---

# 16. Branch B: August chooses Spela ändå

Assume August selects:

```text
Spela ändå
```

The engine/application transition records that the complete move is now being proposed to Anna.

Conceptually:

```json
{
  "turnState": {
    "type": "WAITING_FOR_OPPONENT_APPROVAL",
    "proposingPlayerId": "player-1",
    "reviewingPlayerId": "player-2"
  },
  "pendingMove": {
    "playerId": "player-1",
    "status": "WAITING_FOR_OPPONENT"
  }
}
```

The proposal should be persisted.

---

# 17. Important: the turn has not completed

At this point:

```text
August has NOT scored.
```

```text
August has NOT drawn replacement tiles.
```

```text
Anna has NOT started her normal turn.
```

```text
GRÖMP has NOT been added to accepted vocabulary.
```

The move is unresolved.

---

# 18. Local handoff to Anna

The application hides private rack information and enters:

```text
HANDOFF_TO_REVIEW
```

The UI shows:

```text
Anna behöver ta ställning till Augusts läggning.

Lämna över enheten till Anna.

[ Fortsätt ]
```

Neither player's rack is shown.

---

# 19. Anna opens the review

Anna takes the device and selects:

```text
Fortsätt
```

The application enters the review view.

The board remains visible with August's proposed tiles clearly distinguished from committed tiles.

The UI shows:

```text
August vill spela:

GRÖMP

Ordet finns inte i ordlistan.

Läggningen ger 18 poäng om den godkänns.

[ Neka ]   [ Godkänn ]
```

---

# 20. What Anna may inspect

During review Anna should be able to see:

- The full board
- The proposed tiles
- The unknown word
- The provisional move score
- Current public scores
- Who proposed the move

Anna should not see August's rack.

Anna's own rack should also remain hidden until her normal turn actually begins.

---

# 21. The review decision is binary

Anna does not edit August's move.

Anna cannot:

- Move August's tiles
- Remove one word from the move
- Change the blank
- Accept only part of the placement
- Change the score

Anna can only:

```text
Godkänn
```

or:

```text
Neka
```

---

# 22. Acceptance branch

Assume Anna selects:

```text
Godkänn
```

The application sends an approval action.

Conceptually:

```json
{
  "type": "ACCEPT_PROPOSED_MOVE",
  "reviewingPlayerId": "player-2"
}
```

The engine verifies that Anna is the expected reviewer.

---

# 23. Atomic acceptance

The engine should atomically:

1. Confirm the reviewer is allowed to accept.
2. Commit all pending tiles.
3. Apply the previously determined/revalidated score.
4. Add `GRÖMP` to the game's accepted vocabulary.
5. Draw replacement tiles for August.
6. Update the tile bag.
7. Record structured history.
8. Clear the pending move.
9. Advance normal turn ownership to Anna.
10. Check game-end conditions.

Do not persist halfway through these steps.

---

# 24. Accepted vocabulary after approval

Conceptually:

```json
{
  "acceptedVocabulary": [
    {
      "word": "GRÖMP",
      "proposedByPlayerId": "player-1",
      "acceptedByPlayerId": "player-2"
    }
  ]
}
```

For fast validation, runtime lookup may use:

```ts
Set<string>
```

The normalized word is the important lookup key.

---

# 25. Score after approval

Before:

```text
August = 74
```

After:

```text
August = 92
```

using the illustrative 18-point score.

Anna's score remains unchanged.

---

# 26. History after approval

Structured events may include:

```text
UNKNOWN_WORD_PROPOSED
UNKNOWN_WORD_ACCEPTED
WORD_MOVE_COMMITTED
```

For example:

```json
{
  "type": "UNKNOWN_WORD_ACCEPTED",
  "playerId": "player-2",
  "payload": {
    "proposingPlayerId": "player-1",
    "words": ["GRÖMP"]
  }
}
```

and:

```json
{
  "type": "WORD_MOVE_COMMITTED",
  "playerId": "player-1",
  "payload": {
    "words": ["GRÖMP"],
    "score": 18,
    "usedUnknownWordApproval": true
  }
}
```

The UI might render:

```text
August: GRÖMP +18
Godkänt av Anna
```

---

# 27. Transition into Anna's normal turn

Anna is already holding the device, but her rack should not appear immediately on the review screen.

Show a clear transition:

```text
Läggningen godkändes.

Nu är det Annas tur.

[ Börja tur ]
```

After:

```text
Börja tur
```

Anna's rack becomes visible.

August's rack remains hidden.

---

# 28. Reusing GRÖMP later

Suppose Anna later forms:

```text
GRÖMP
```

again.

Validation should check:

```text
dictionary
    → not found

accepted vocabulary
    → found
```

Result:

```text
ACCEPTED_IN_GAME
```

The move does not require a second opponent decision.

The earlier acceptance applies for the remainder of that game.

---

# 29. Rejection branch

Return to the review point and instead assume Anna selects:

```text
Neka
```

The application sends:

```json
{
  "type": "REJECT_PROPOSED_MOVE",
  "reviewingPlayerId": "player-2"
}
```

The engine verifies that Anna is the correct reviewer.

---

# 30. State effects of rejection

Rejection must result in:

```text
Score:
    unchanged
```

```text
Tile bag:
    unchanged
```

```text
August's rack ownership:
    unchanged except tiles remain pending
```

```text
Accepted vocabulary:
    unchanged
```

```text
Normal turn owner:
    August
```

```text
Pending tiles:
    remain editable
```

Anna does not receive a normal turn.

---

# 31. Rejected pending state

Conceptually:

```json
{
  "currentPlayerId": "player-1",
  "turnState": {
    "type": "PLAYER_TURN",
    "playerId": "player-1"
  },
  "pendingMove": {
    "playerId": "player-1",
    "status": "REJECTED",
    "placedTiles": [
      "...same proposed tiles..."
    ]
  }
}
```

The implementation may transition `REJECTED` back to `EDITING` after the handoff.

What matters is that the placement is preserved and editable.

---

# 32. Handoff back to August

The local application enters:

```text
HANDOFF_BACK_AFTER_REJECTION
```

and shows:

```text
Läggningen nekades.

Lämna tillbaka enheten till August.

[ Fortsätt ]
```

No rack is visible.

---

# 33. August resumes after rejection

August takes the device and selects:

```text
Fortsätt
```

Now:

- August's rack becomes visible.
- `GRÖMP` tiles remain where they were placed.
- They still look pending.
- August can modify them.

The UI may show:

```text
Anna nekade läggningen. Ändra den och försök igen.
```

---

# 34. August changes the move

Suppose August removes `M` and `P` and rearranges the remaining tiles to create a normal dictionary-valid word.

The pending move changes.

The previous rejected proposal does not permanently poison those physical tiles.

When August selects `Spela` again, the engine performs a fresh validation of the current placement.

---

# 35. Rejection is not a pass

A rejection must not behave like:

```text
PASS
```

It must not increment pass-related counters as a completed turn.

The turn is unresolved until August eventually:

- Commits a legal move
- Successfully gets an unknown-word move accepted
- Passes
- Exchanges tiles
- Otherwise completes a turn according to the rules

---

# 36. Multiple unknown words

Suppose one placement forms:

```text
GRÖMP
FLÄRP
```

and neither is in the dictionary.

The proposing-player dialog should show both:

```text
Följande ord finns inte i ordlistan:

GRÖMP
FLÄRP

Vill du spela läggningen ändå?

[ Ändra ]   [ Spela ändå ]
```

If August proceeds, Anna reviews them together.

---

# 37. Whole-move acceptance

Anna sees:

```text
August vill spela en läggning med orden:

GRÖMP
FLÄRP

Orden finns inte i ordlistan.

[ Neka ]   [ Godkänn ]
```

There must not be separate controls such as:

```text
GRÖMP: accept/reject
FLÄRP: accept/reject
```

The complete move is one proposal.

---

# 38. Multiple words accepted

If Anna accepts the complete move:

```text
GRÖMP
FLÄRP
```

are both added to accepted vocabulary.

All newly formed words are committed.

The complete move score is awarded.

---

# 39. Multiple words rejected

If Anna rejects:

- Neither word becomes accepted.
- No part of the placement commits.
- No partial score is awarded.
- All newly placed tiles remain pending for August.

Acceptance/rejection is atomic at move level.

---

# 40. Mixture of dictionary and unknown words

Suppose a placement forms:

```text
BIL
GRÖMP
```

where:

```text
BIL = DICTIONARY_WORD
GRÖMP = UNKNOWN_WORD
```

The move still requires approval because at least one formed word is unknown.

The review should focus on the unknown word(s), while acceptance applies to the entire move.

If accepted:

- `BIL` commits normally.
- `GRÖMP` commits.
- Only `GRÖMP` needs to be added to accepted vocabulary.

---

# 41. Mixture containing a one-letter fragment

Suppose a placement forms:

```text
BIL
<FORBIDDEN WORD>
A
```

where `A` is a one-letter crossing fragment.

The move must not be offered for opponent approval.

A one-letter word makes the move unplayable — this is the one remaining `FORBIDDEN_WORD`
category (game-rules.md section 10, DEC-007).

Conceptually:

```text
FORBIDDEN_WORD
    ↓
Return to editing
```

The opponent cannot override the minimum-word-length rule.

As of DEC-007, this no longer applies to proper names, place names, or non-standard
abbreviations — see sections 42-43.

---

# 42. Proper names and place names

Per DEC-007, ordinary names and place names are not standard dictionary words, but they are not
hard-blocked either.

They are classified as `UNKNOWN_WORD`, the same as `GRÖMP` in this example: the proposing
player may attempt them, and the opponent decides whether to accept them.

There should be no word category the proposing player cannot at least attempt — the engine
never unilaterally rejects a word's content; only the opponent's decision does.

Countries, months, and weekdays remain explicit exceptions that auto-accept as ordinary
dictionary words, with no proposal step needed.

---

# 43. Abbreviations

Abbreviations are generally not standard dictionary words, but per DEC-007 they are not
hard-blocked.

Explicitly configured exceptions auto-accept as ordinary dictionary words.

Therefore:

```text
non-standard abbreviation
    → UNKNOWN_WORD
```

not:

```text
FORBIDDEN_WORD
```

An opponent may accept or reject a non-standard abbreviation, exactly as with any other
`UNKNOWN_WORD`.

---

# 44. Verb forms and plurals

Valid Swedish grammatical forms such as:

- Verb conjugations
- Plurals

may be legal according to the agreed word rules.

If a legitimate form is absent from the chosen dictionary but is not explicitly forbidden, it may fall into:

```text
UNKNOWN_WORD
```

and therefore be proposed to the opponent.

This mechanic is intentionally useful when dictionary coverage is imperfect.

---

# 45. Refresh while awaiting review

Suppose August has selected:

```text
Spela ändå
```

and the game is awaiting Anna's decision.

The browser is refreshed.

Because the proposal state was persisted:

```text
Reload
    ↓
Saved game detected
    ↓
RESUME_HANDOFF
    ↓
Anna is identified as required reviewer
```

The UI should say:

```text
Spelet är redo att fortsätta.

Lämna enheten till Anna.

[ Fortsätt ]
```

After continuation, the same proposal is shown.

August must not be allowed to silently edit it before Anna decides.

---

# 46. Refresh after rejection

Suppose Anna rejects and the browser is refreshed before August presses `Fortsätt`.

The saved state should still identify August as the person who must regain control.

On resume:

```text
handoff to August
    ↓
August continues
    ↓
rejected pending placement restored
```

---

# 47. No double acceptance

The acceptance action must be safe against accidental duplicate UI activation.

A proposal that has already been committed must not be committed again.

For example:

```text
double click Godkänn
```

must not result in:

- Double score
- Double tile draw
- Duplicate history
- Two turn advances

The engine should reject actions that do not match the current turn state.

---

# 48. No stale rejection

Similarly, a stale rejection action must not undo an already accepted move.

Actions should be validated against current authoritative state.

This becomes even more important in future online multiplayer.

---

# 49. Why this flow belongs in the engine

The UI should not implement logic such as:

```text
if Anna clicks accept:
    August.score += previewScore
    add tiles to board
    switch player
```

Instead:

```text
UI
 ↓
ACCEPT_PROPOSED_MOVE
 ↓
Game engine
 ↓
new authoritative state
```

The engine owns the semantics of acceptance and rejection.

---

# 50. Why the handoff does not belong in the engine

The engine does need to know:

```text
proposal is awaiting player-2
```

It does not need to know:

```text
the physical phone has been handed to Anna
```

The latter belongs to local multiplayer presentation.

In future online play, Anna receives the proposal on her own device and the physical handoff disappears.

---

# 51. Future online equivalent

The same gameplay flow should later become:

```text
August submits unknown word
      ↓
Server validates
      ↓
August confirms proposal
      ↓
Server stores WAITING_FOR_OPPONENT_APPROVAL
      ↓
Anna receives turn/review notification
      ↓
Anna opens match
      ↓
Anna accepts or rejects
      ↓
Server executes authoritative transition
```

No fundamental rewrite of the rule should be necessary.

---

# 52. Tests derived from this example

The game engine should test at least:

```text
Unknown word
→ requires proposing-player confirmation
```

```text
Proposer cancels
→ returns to editing
```

```text
Proposer confirms
→ enters waiting-for-opponent state
```

```text
Wrong player attempts review
→ rejected
```

```text
Opponent accepts
→ move commits
```

```text
Opponent accepts
→ score applied once
```

```text
Opponent accepts
→ unknown word added to accepted vocabulary
```

```text
Accepted word used later
→ no second approval required
```

```text
Opponent rejects
→ score unchanged
```

```text
Opponent rejects
→ tile bag unchanged
```

```text
Opponent rejects
→ proposing player retains turn
```

```text
Opponent rejects
→ pending tiles preserved
```

```text
Opponent rejects
→ word not added to accepted vocabulary
```

```text
Multiple unknown words
→ one whole-move decision
```

```text
Any forbidden word
→ proposal not allowed
```

---

# 53. UI/end-to-end tests

End-to-end tests should verify:

```text
Proposing player's rack disappears before opponent review
```

```text
Opponent review shows proposed board and unknown word
```

```text
Reviewing player's rack remains hidden during decision
```

```text
Acceptance transitions cleanly into reviewing player's normal turn
```

```text
Rejection shows handoff back to proposer
```

```text
Rejected placement is still present after handoff
```

```text
Refresh while waiting for review restores correct reviewer
```

---

# 54. State-machine summary

The defining state path is:

```text
PLAYER_TURN
    ↓
EDITING_PENDING_MOVE
    ↓
SUBMIT
    ↓
UNKNOWN_WORD_FOUND
    ↓
REQUIRES_PLAYER_CONFIRMATION
    ├───────────────┐
    │ Ändra         │ Spela ändå
    ↓               ↓
EDITING       WAITING_FOR_OPPONENT
                    │
              ┌─────┴─────┐
              │           │
            Neka       Godkänn
              │           │
              ↓           ↓
        PLAYER_TURN    COMMIT MOVE
        same player       │
        tiles remain      ↓
        pending        NEXT PLAYER
```

The exact implementation state names may differ.

The behaviour must not.

---

# 55. Central invariant

Until the opponent accepts:

> The proposed move is not a committed move.

Therefore before acceptance:

- Board occupancy is not permanently changed.
- Score is not awarded.
- Replacement tiles are not drawn.
- Unknown vocabulary is not accepted.
- The proposing player's turn is not completed.

This invariant should guide the implementation.

---

# 56. Definition of success

This example has served its purpose if Claude can implement the disputed-word mechanic without ambiguity about:

- The difference between unknown and forbidden words
- Why the proposer is asked first
- Why the opponent is asked second
- Why all unknown words in one placement are reviewed together
- Why acceptance applies to the entire move
- What changes on acceptance
- What must not change before acceptance
- What happens on rejection
- Why rejected tiles remain editable
- Why rejection does not consume the proposing player's turn
- Why accepted vocabulary is local to the game
- How the same state machine can later support online multiplayer
