# Local Multiplayer

## 1. Purpose

This document defines Version 1 local multiplayer behaviour.

Version 1 is a two-player hot-seat game played on one website and one device.

The goals are to:

- Allow two people to play a complete game on one device.
- Allow one person to control both players for testing or solo experimentation.
- Protect each player's rack during normal two-person hot-seat play.
- Handle the custom unknown-word approval flow correctly.
- Persist an ongoing game locally so an accidental refresh does not destroy it.
- Keep local multiplayer as a presentation/application concern so the core game engine can later be reused for online multiplayer.

---

## 2. Scope

Version 1 supports:

```text
2 players
1 device
1 browser
1 local game
```

It does not require:

- User accounts
- Internet connectivity after the site has loaded
- Matchmaking
- Friends
- Online invitations
- Realtime networking
- Chat
- A backend
- A database

Those features belong to later phases.

---

## 3. Hot-seat model

The basic turn loop is:

```text
Player A plays
      ↓
Private information is hidden
      ↓
Handoff screen
      ↓
Device is passed
      ↓
Player B continues
```

The interface must explicitly support this handoff.

It should not assume that players will remember to hide their racks manually.

---

## 4. Player setup

Before the game starts, collect:

- Player 1 display name
- Player 2 display name
- Rack size: 6, 7, or 8

Player names are local labels only.

They are not accounts.

Each player must receive a stable internal ID independent of their display name.

---

## 5. Game initialization

When the players select `Starta spel`, the application should:

1. Validate setup inputs.
2. Create a new game using the Swedish Alfapet configuration.
3. Create the two players.
4. Initialize and shuffle the tile bag.
5. Draw each player's starting rack.
6. Determine the starting player according to `game-rules.md`.
7. Persist the initial game state.
8. Enter a privacy-safe handoff/start state.
9. Reveal the starting player's rack only after explicit continuation.

The game engine owns steps involving gameplay state.

The application layer owns persistence and handoff presentation.

---

## 6. Private information

In local hot-seat mode, the primary private information is:

```text
Player rack contents
```

The following may remain public:

- Board
- Scores
- Number of tiles remaining in the bag
- Move history
- Accepted/rejected unknown-word decisions
- Whose turn it is

The opponent's rack contents must not be visible during another player's normal turn.

---

## 7. Rack visibility

During Player A's normal turn:

```text
Player A rack = visible
Player B rack = hidden
```

During Player B's normal turn:

```text
Player A rack = hidden
Player B rack = visible
```

During a handoff:

```text
Player A rack = hidden
Player B rack = hidden
```

During opponent review of an unknown word:

```text
Proposing player's rack = hidden
Reviewing player's rack = preferably hidden
```

The review decision does not require either rack.

---

## 8. Privacy implementation

Rack privacy should be implemented by controlling what is rendered.

Avoid:

```text
Render rack
→ cover it with an overlay
```

Prefer:

```text
Handoff/review state
→ rack component receives no private tile data
```

This reduces accidental exposure through:

- Animation
- Layout glitches
- Transparent overlays
- Screen transitions

For Version 1 this is UX privacy rather than strong security, because all state exists in the same browser.

---

## 9. One-person play

A user may choose to play both sides themselves.

No separate game mode is required initially.

They can simply press `Fortsätt` at each handoff and control both players.

The game rules remain identical.

Do not weaken the approval mechanic in one-person use: if an unknown word is proposed, the other player position still accepts or rejects it.

---

# 10. Normal turn flow

A normal turn should behave as follows:

```text
Handoff screen
      ↓
Current player presses Fortsätt
      ↓
Current player's rack appears
      ↓
Player places/edits tiles
      ↓
Player chooses an action
```

Available actions are governed by the engine, typically:

```text
Spela
Byt brickor
Passa
```

---

## 11. Normal dictionary-valid move

For a valid move containing no words requiring approval:

```text
Player submits
      ↓
Engine validates
      ↓
Engine calculates score
      ↓
Move commits
      ↓
Replacement tiles are drawn
      ↓
State is persisted
      ↓
Rack is hidden
      ↓
Handoff screen
      ↓
Next player continues
```

There must be no frame in which the next player's rack is exposed before the handoff screen.

---

## 12. Invalid placement

If the engine rejects the placement for a physical/game-rule reason:

```text
Submit
   ↓
Validation error
   ↓
Show explanation
   ↓
Same player's turn continues
```

The pending tiles remain editable unless the specific error/action requires otherwise.

There is no handoff.

---

## 13. Forbidden word

If a formed word is explicitly forbidden rather than merely absent from the dictionary:

```text
Submit
   ↓
FORBIDDEN_WORD
   ↓
Explain that move cannot be played
   ↓
Same player continues editing
```

The opponent is not asked to approve it.

---

# 14. Unknown-word proposal flow

The defining custom flow is:

```text
Player A submits move
      ↓
Engine finds unknown word(s)
      ↓
Player A is warned
      ↓
Player A chooses:
    ├── Ändra
    └── Spela ändå
```

The whole move is treated as one unit.

If several newly formed words are unknown, they are presented together.

---

## 15. Player chooses Ändra

If the proposing player does not want to proceed:

```text
Ändra
   ↓
Close warning
   ↓
Return to editable move
```

No game-state ownership changes.

No score is applied.

No replacement tiles are drawn.

No handoff occurs.

---

## 16. Player chooses Spela ändå

If the proposing player confirms:

```text
Spela ändå
      ↓
Pending move becomes awaiting opponent approval
      ↓
Persist state
      ↓
Hide proposing player's rack
      ↓
Show handoff screen
```

Example:

```text
Anna behöver ta ställning till Augusts läggning.

Lämna över enheten till Anna.

[ Fortsätt ]
```

The move is still uncommitted.

---

# 17. Opponent review

After the reviewing opponent presses `Fortsätt`, show:

- Board
- Proposed tiles
- Unknown word or words
- Score preview
- Proposing player's name
- `Godkänn`
- `Neka`

Do not begin the reviewing player's normal turn yet.

This is a distinct response state.

---

## 18. Approval applies to the entire move

If a move forms multiple unknown words, the opponent does not approve them individually.

The decision is:

```text
Accept entire proposed move
```

or:

```text
Reject entire proposed move
```

This matches the agreed game rule.

---

## 19. Opponent accepts

If Player B selects `Godkänn`:

```text
Pending move
      ↓
Engine commits move
      ↓
Unknown words added to accepted vocabulary
      ↓
Score applied
      ↓
Replacement tiles drawn for Player A
      ↓
Move/history recorded
      ↓
Player B becomes next normal player
```

The application then persists the new state.

Because Player B is already holding the device, a second full physical handoff is not necessarily required.

However, there should be a clear transition from:

```text
Reviewing Player A's move
```

to:

```text
Player B's normal turn
```

A simple intermediate confirmation is appropriate:

```text
Läggningen godkändes.

Nu är det Annas tur.

[ Börja tur ]
```

Only after `Börja tur` should Player B's rack be shown.

---

## 20. Opponent rejects

If Player B selects `Neka`:

```text
Pending move
      ↓
Engine marks/returns it as rejected/editable
      ↓
No score
      ↓
No replacement tiles
      ↓
No accepted-vocabulary update
      ↓
Player A remains owner of the turn
```

The application persists this state and shows:

```text
Läggningen nekades.

Lämna tillbaka enheten till August.

[ Fortsätt ]
```

---

## 21. Return after rejection

After Player A presses `Fortsätt`:

- Player A's rack is visible.
- The rejected placed tiles remain on the board as pending tiles.
- Player A can move them.
- Player A can remove them.
- Player A can change the represented letter of a pending blank.
- Player A can submit again.

Committed board tiles remain locked.

---

## 22. Rejection does not consume the turn

A rejected unknown-word proposal does not count as a completed turn.

Therefore:

- The original player continues.
- No points are awarded.
- No tiles are drawn.
- The opponent does not get a normal turn.
- Pass counters/end-game counters are not advanced as if a turn had completed.

The player may revise the move until they perform a completed legal turn action.

---

# 23. Passing

If the current player passes:

```text
Player selects Passa
      ↓
Confirm
      ↓
Engine records pass
      ↓
Persist
      ↓
Hide rack
      ↓
Handoff
      ↓
Next player
```

Passing is a completed turn.

The engine determines whether passing contributes to an end-game condition.

---

# 24. Tile exchange

If the current player exchanges tiles:

```text
Player selects Byt brickor
      ↓
Select rack tiles
      ↓
Confirm exchange
      ↓
Engine validates exchange
      ↓
Engine performs exchange
      ↓
Persist
      ↓
Hide rack
      ↓
Handoff
      ↓
Next player
```

The UI must not reveal newly drawn tiles before the handoff boundary is safely resolved if doing so could expose private information to the previous player.

A straightforward approach is to complete the engine action, immediately render the handoff state, and only render the next active rack after continuation.

---

# 25. Handoff state

The application should model handoff explicitly.

Conceptually:

```text
LocalSessionState
├── mode
├── expectedViewerPlayerId
└── messageContext
```

Possible modes include:

```text
HANDOFF_TO_TURN
HANDOFF_TO_REVIEW
HANDOFF_BACK_AFTER_REJECTION
RESUME_HANDOFF
```

These are application/UI states.

They are not core game rules.

---

## 26. Why handoff is not GameState

The engine needs to know:

- Current player
- Pending move
- Who may review a proposal
- Whether a move is committed

It does not need to know:

- Whether the physical device has been passed
- Whether the next person has pressed `Fortsätt`

Those are local presentation concerns.

This distinction is important for future online multiplayer, where no physical handoff exists.

---

# 27. Persistence

Version 1 should automatically persist the ongoing local game using `localStorage`.

Persist after meaningful authoritative state transitions, including:

- Game creation
- Move commit
- Unknown proposal confirmation
- Unknown proposal acceptance
- Unknown proposal rejection
- Pass
- Tile exchange
- Game end

If pending tile placements are persisted during editing, follow the policy below.

---

## 28. Pending placement persistence

Recommended Version 1 policy:

> Persist the authoritative pending placement whenever it changes.

This means an accidental refresh does not destroy a partially constructed move.

Persist after:

- Placing a tile
- Moving a pending tile
- Removing a pending tile
- Choosing/changing a blank letter

This creates a more robust local experience.

Because these actions may occur frequently, persistence should remain simple and synchronous; the game state is small enough for `localStorage`.

---

## 29. Saved-game wrapper

Persist a wrapper such as:

```text
SavedLocalGame
├── schemaVersion
├── configurationVersion
├── savedAt
└── gameState
```

Do not persist arbitrary React component state.

The application should reconstruct the appropriate UI/session state after loading.

---

# 30. Resume policy

If a valid unfinished game is found when the website opens, offer:

```text
Fortsätt spel
```

Do not immediately reveal a rack.

After selection, enter:

```text
RESUME_HANDOFF
```

and show a neutral privacy screen.

Example:

```text
Spelet är redo att fortsätta.

Lämna enheten till August.

[ Fortsätt ]
```

The correct player/reviewer should be determined from the loaded game state.

---

## 31. Resume normal turn

If the saved game is in a normal editable Player A turn:

```text
Resume
   ↓
Handoff to Player A
   ↓
Player A presses Fortsätt
   ↓
Player A rack/pending move appears
```

If Player A had pending tiles before refresh, restore them.

---

## 32. Resume awaiting opponent review

If the saved state contains a proposal awaiting Player B's approval:

```text
Resume
   ↓
Handoff to Player B
   ↓
Player B presses Fortsätt
   ↓
Opponent review screen
```

Do not return the game to Player A merely because the page was refreshed.

The authoritative game state determines who must act next.

---

## 33. Resume after rejection

If a rejected proposal is waiting for the proposing player to edit it:

```text
Resume
   ↓
Handoff to proposing player
   ↓
Fortsätt
   ↓
Rejected pending placement restored
```

---

# 34. Saved-game corruption

If saved data cannot be loaded safely:

- Do not crash the application.
- Do not attempt risky partial reconstruction.
- Explain that the saved game could not be restored.
- Allow the user to start a new game.

Development builds may log diagnostic details.

Production UI should not expose raw parsing errors.

---

# 35. Starting a new game

If an unfinished saved game exists, starting a new game should require confirmation.

Example:

```text
Det finns ett pågående spel.

Om du startar ett nytt spel försvinner det gamla.

[ Avbryt ] [ Starta nytt ]
```

Only delete/replace the saved game after confirmation.

---

# 36. Completed game persistence

When a game finishes, it may remain locally available long enough to show the final result/history.

Version 1 does not need a library of historical games.

When the players start a new game, the completed local game may be replaced.

A future version can introduce persistent match history.

---

# 37. Browser tabs

Version 1 does not need to support controlling the same local game from multiple browser tabs.

If two tabs are opened, behaviour may be undefined beyond normal `localStorage` persistence.

Do not build synchronization/locking infrastructure for this edge case.

Future online multiplayer solves shared-state synchronization at the server level.

---

# 38. Multiple local games

Version 1 only needs one saved ongoing local game.

Do not build:

- Game slots
- Local game library
- Multiple concurrent matches

Future online multiplayer will introduce proper match lists.

---

# 39. Offline behaviour

Once the site and dictionary assets are loaded, the local game should not depend on external APIs during play.

A full installable Progressive Web App is not required in Version 1.

Do not add service-worker complexity solely for offline support unless it becomes a deliberate later requirement.

---

# 40. Device orientation and resizing

A local game should survive:

- Window resizing
- Mobile/tablet orientation changes

These must not alter authoritative game state.

Pending placements and selected blank letters remain intact.

Pure UI selection state may be reset if necessary, but gameplay state must remain.

---

# 41. Browser refresh

Refresh should be treated as a normal recoverable event.

Expected behaviour:

```text
Refresh
   ↓
Application reloads
   ↓
Saved game detected
   ↓
User chooses/enters continue flow
   ↓
Privacy-safe handoff
   ↓
Correct game state restored
```

No completed move should be duplicated during restoration.

---

# 42. Atomic transitions

Important gameplay transitions should be applied as one coherent engine operation before persistence.

For example, opponent acceptance should not be stored as:

```text
word accepted
```

followed later by separate saved updates for:

```text
score applied
tiles drawn
turn changed
```

The engine should produce one resulting state containing all effects.

Then the application persists that state.

This avoids partially completed games after crashes/errors.

---

# 43. Local application controller

The local application layer should coordinate:

```text
User interaction
      ↓
Game action
      ↓
Engine
      ↓
New GameState
      ↓
Persistence
      ↓
Determine local handoff/view state
      ↓
Render
```

It should not duplicate rule logic.

For example, it should not independently decide that a rejected move returns to Player A. The engine state should communicate that Player A is responsible for the unresolved turn.

---

# 44. Privacy-safe view derivation

The application should derive a local player view based on:

- Game state
- Current local session/handoff state
- Player whose private information may currently be shown

Conceptually:

```text
deriveLocalGameView(gameState, localSessionState)
```

The resulting view can omit hidden rack information.

This pattern also prepares the codebase for future server-generated player-specific views.

---

# 45. Turn ownership versus device viewer

Keep these concepts separate:

```text
Turn owner
```

is a game-engine concept.

```text
Current device viewer
```

is a local UI concept.

During opponent review:

```text
Turn owner = proposing player
Device viewer = reviewing opponent
```

This is why simply using `currentPlayerId` to decide which rack to show is unsafe.

---

# 46. Review ownership

The engine should make it possible to derive:

```text
Who proposed the move?
Who is allowed to review it?
```

The local application uses this to display the correct handoff.

Do not infer the reviewer solely from UI history.

---

# 47. Game end during local play

When the engine reports that the game is finished:

```text
Persist final state
      ↓
Hide private racks if transitioning
      ↓
Show final result
```

At game end, rack contents may be shown as part of final scoring if required by the rules/UI.

The final result screen should clearly explain score deductions and winner.

---

# 48. Testing local multiplayer

Local multiplayer should have tests covering at least:

### Normal handoff

```text
Player A commits move
→ Player B rack is not immediately exposed
→ handoff
→ Player B continues
```

### Unknown word accepted

```text
Player A proposes
→ rack hidden
→ Player B reviews
→ accepts
→ Player B begins normal turn
```

### Unknown word rejected

```text
Player A proposes
→ Player B rejects
→ handoff back
→ Player A pending tiles restored/editable
```

### Refresh during normal turn

```text
pending state saved
→ refresh
→ neutral resume screen
→ correct player resumes
```

### Refresh during review

```text
proposal awaiting Player B
→ refresh
→ resume hands device to Player B
→ review restored
```

### Private rack handling

At no handoff/review boundary should the wrong rack be rendered.

---

# 49. End-to-end scenarios

Playwright should eventually cover the main hot-seat flows.

A critical full scenario is:

```text
Create game
→ Player 1 starts
→ plays valid word
→ handoff
→ Player 2 plays unknown word
→ confirms proposal
→ handoff to Player 1 for review
→ Player 1 rejects
→ handoff back to Player 2
→ Player 2 edits move
→ submits valid word
→ move commits
```

This exercises the defining mechanic of the product.

---

# 50. Future online migration

Local multiplayer should not be implemented as a separate set of game rules.

The future difference should mainly be:

### Local

```text
Game engine runs in browser
Game state stored locally
Handoff controls privacy
```

### Online

```text
Game engine runs authoritatively on server
Game state stored remotely
Each user has their own device/view
Network events replace physical handoff
```

The same domain actions should remain recognizable in both modes.

---

# 51. What disappears online

The following local concepts are expected to disappear or change substantially online:

- Physical device handoff
- `Fortsätt` privacy screen between players
- Both racks existing in one client memory
- `localStorage` as authoritative persistence

The following concepts remain:

- Players
- Turns
- Pending moves
- Unknown-word proposals
- Opponent approval/rejection
- Accepted vocabulary
- Scoring
- Game history

This is why handoff logic must stay outside the engine.

---

# 52. V1 non-goals

Do not implement:

- AI opponent
- LAN multiplayer
- Peer-to-peer multiplayer
- Multiple devices
- QR-code joining
- Spectators
- Timed turns
- Multiple simultaneous local games
- Local profiles
- Local statistics
- Chat
- Friend features

Version 1 should focus on making the two-player shared-device game excellent.

---

# 53. Definition of done

Local multiplayer Version 1 is complete when:

- Two named players can start a Swedish game on one device.
- Rack size can be selected according to the game rules.
- Only the appropriate player's rack is visible.
- Normal completed turns produce a privacy-safe handoff.
- One person can operate both players without a separate mode.
- Unknown words can be proposed.
- The proposing player's rack is hidden before review.
- The opponent can accept or reject the whole move.
- Acceptance commits the move and starts the opponent's normal turn.
- Rejection returns control to the proposing player.
- Rejected tiles remain editable on the board.
- Passing and tile exchange correctly hand off the turn.
- Ongoing game state is automatically persisted.
- Pending placements survive refresh.
- Awaiting-review state survives refresh.
- Resume always starts from a privacy-safe handoff.
- Starting a new game does not accidentally overwrite an ongoing game.
- Local multiplayer logic does not contaminate the core game engine.
- The architecture remains suitable for replacing physical handoffs with online networking later.
