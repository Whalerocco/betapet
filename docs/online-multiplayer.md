# Online Multiplayer

## 1. Purpose

This document defines the intended direction for online multiplayer after the local Version 1 is complete.

It is primarily an architectural guide, not an instruction to implement online multiplayer immediately.

The goals are to ensure that the local game is built in a way that can later support:

- User accounts
- Friends
- Match invitations
- Multiple concurrent matches
- Turn-based online play
- Unknown-word approval across devices
- In-game chat
- Notifications
- Persistent match history

The core principle is:

> The online version should reuse the same game rules and game engine rather than create a second implementation of the game.

---

## 2. Version boundary

Do not implement the online system while building the first local playable version unless a task explicitly moves the project into the online phase.

Version 1 remains:

```text
2 players
1 device
browser-local game engine
local persistence
```

Future online mode becomes:

```text
2 players
separate devices
server-authoritative game engine
remote persistence
```

---

## 3. What should remain unchanged

The following core concepts should survive the transition to online multiplayer:

- Game configuration
- Board
- Tiles
- Tile bag
- Player participation
- Racks
- Turns
- Pending moves
- Physical move validation
- Word detection
- Dictionary validation
- Unknown words
- Forbidden words
- Opponent approval
- Accepted per-game vocabulary
- Scoring
- Passing
- Tile exchange
- Game-end rules
- Structured game history

These belong to the game domain.

---

## 4. What changes online

Local-only concepts are replaced by network/server concepts.

Local:

```text
Physical device handoff
localStorage
both players' state in one browser
```

Online:

```text
player-specific views
server/database persistence
network requests/events
authentication
notifications
```

The physical handoff screens disappear because each player uses their own device.

---

# 5. Server authority

Online games must be server-authoritative.

The client should send actions such as:

```text
PLACE_TILE / update pending move
SUBMIT_MOVE
CONFIRM_UNKNOWN_WORD_PROPOSAL
ACCEPT_PROPOSED_MOVE
REJECT_PROPOSED_MOVE
PASS
EXCHANGE_TILES
```

The server then:

1. Authenticates the user.
2. Determines which player they represent.
3. Loads authoritative match state.
4. Validates whether the requested action is allowed.
5. Runs the shared game engine.
6. Persists the resulting state atomically.
7. Returns or broadcasts appropriate player-safe views.

Clients must not submit arbitrary replacement game state.

---

## 6. Why server authority matters

Without server authority, a modified client could potentially:

- Change its score.
- Inspect the opponent's rack.
- Choose desired tiles from the bag.
- Submit impossible placements.
- Accept its own disputed word.
- Change accepted vocabulary.
- Play out of turn.

The server must be the source of truth for online games.

---

# 7. Shared game engine

The TypeScript game engine should be reusable in both environments.

Conceptually:

```text
Version 1

Browser
  ↓
Game engine
```

Later:

```text
Online

Client
  ↓ action
Server
  ↓
Same game engine
  ↓
Database
```

The engine must therefore remain free from:

- React
- DOM APIs
- localStorage
- Authentication libraries
- Database APIs
- WebSocket APIs

---

# 8. User versus Player

Keep these concepts distinct.

A `User` is an online account.

A `Player` is a participant in one particular game.

Conceptually:

```text
User
  ↓ participates as
Player
  ↓ belongs to
Game
```

A user may participate in many matches.

A game has its own player records and scores.

This separation is already described in `content-model.md`.

---

# 9. Authentication

Online multiplayer requires authentication.

Do not build custom password handling.

Use a mature managed authentication system when the online phase begins.

A possible future platform is Supabase Auth, as described in `tech-stack.md`, but the choice should be reevaluated at implementation time.

Potential login methods may include:

- Email
- Magic link
- OAuth providers

The first online version does not need every authentication method.

---

# 10. Profile

A minimal online profile may contain:

```text
User
├── id
├── displayName
├── createdAt
└── optional avatar
```

Avoid requiring unnecessary personal information.

The game only needs enough identity to:

- Find friends
- Identify opponents
- Display match ownership
- Send invitations

---

# 11. Friends

Users should eventually be able to:

- Search/find another user
- Send a friend request
- Accept/decline a friend request
- View friends
- Start a match with a friend

Conceptually:

```text
Friendship
├── requesterUserId
├── recipientUserId
└── status
```

Possible statuses:

```text
PENDING
ACCEPTED
DECLINED
BLOCKED
```

The exact social model should be designed when this phase begins.

---

# 12. Match creation

A user should be able to create a match and choose an opponent.

Initial online match setup may include:

- Opponent
- Language/ruleset
- Rack size

For the first online release:

```text
language = Swedish
```

Future language support can use the configuration architecture already established.

---

# 13. Match invitation

Creating a match with a friend may create an invitation:

```text
GameInvitation
├── id
├── senderUserId
├── recipientUserId
├── configuration
└── status
```

The recipient can:

```text
Accept
Decline
```

The game begins only after the invitation is accepted.

---

# 14. Match list

An online user should have a match list.

Useful sections may include:

```text
Din tur
Väntar på motståndaren
Avslutade
```

This game is turn-based, so the match list is more important than a realtime lobby.

A user may eventually have several ongoing matches.

---

# 15. Match status

An online wrapper may contain:

```text
OnlineMatch
├── id
├── gameState
├── participants
├── status
├── createdAt
├── updatedAt
└── lastActionAt
```

Possible wrapper statuses:

```text
INVITED
ACTIVE
FINISHED
CANCELLED
```

Do not confuse wrapper/social status with the core engine's internal turn state.

---

# 16. Player-safe views

The server must never send the full authoritative state to both clients.

For Player A, return:

- Player A's rack
- Public board
- Scores
- Opponent rack count
- Public history
- Relevant pending proposal information
- Turn/review status

Do not return:

- Player B's rack tile identities
- Future tile-bag order
- Other hidden server information

The server should derive a player-specific view.

This derivation is `toPlayerGameView` in `src/game/view/playerGameView.ts`, written as part of
T24.5 before any server exists, so that the rule lives with the game rules and a backend cannot
quietly diverge from it. A pending move follows the same principle and is included only for its
owner, or for the opponent once it has been proposed to them for approval.

---

# 17. Tile bag secrecy

In local Version 1, the full tile bag exists in browser memory.

Online, the authoritative tile bag must remain server-side.

Clients should know only:

```text
number of tiles remaining
```

not:

```text
which tiles remain
```

or:

```text
draw order
```

---

# 18. Turn flow online

A normal online turn becomes:

```text
August opens match
      ↓
Server confirms it is August's turn
      ↓
August places tiles locally in UI
      ↓
August submits action
      ↓
Server validates with game engine
      ↓
Server commits move
      ↓
Database updated
      ↓
Anna becomes current player
      ↓
Anna is notified / sees match under "Din tur"
```

There is no physical handoff.

---

# 19. Pending tile editing online

There are two reasonable approaches:

### Option A — client-local editing

While arranging tiles, placements remain only on the active player's device.

Only submission is sent to the server.

Advantages:

- Simple
- Fewer writes
- Fast interaction

Disadvantage:

- Refresh may lose an unfinished arrangement unless stored locally

### Option B — server-persisted pending editing

Each placement change is saved remotely.

Advantages:

- Seamless cross-device/resume

Disadvantages:

- More requests
- More concurrency/state complexity

Recommended initial online approach:

> Keep ordinary editing client-local and send the complete pending placement on submit.

The server then independently validates tile ownership and placement.

---

# 20. Unknown-word flow online

The custom mechanic maps naturally to asynchronous online play.

Conceptually:

```text
August submits GRÖMP
      ↓
Server validates
      ↓
UNKNOWN_WORD
      ↓
August sees warning
      ↓
August chooses Spela ändå
      ↓
Server stores proposal
      ↓
Match now requires Anna's review
      ↓
Anna is notified
      ↓
Anna opens match
      ↓
Godkänn / Neka
```

---

# 21. Proposer confirmation online

The server should not create an opponent-facing proposal merely because initial validation found an unknown word.

The proposing player must first explicitly confirm:

```text
Spela ändå
```

This preserves the local rules.

Conceptually:

```text
SUBMIT_MOVE
    ↓
server returns UNKNOWN_WORD result
    ↓
client asks proposer
    ↓
CONFIRM_UNKNOWN_WORD_PROPOSAL
```

---

# 22. Proposal persistence

Once confirmed, the server stores enough information to reconstruct and validate the proposal.

This should include:

- Proposing player
- Reviewing player
- Physical tile placements
- Blank represented letters
- Formed words
- Unknown words
- Relevant game-state version/revision

The server should not blindly trust a client-supplied score.

Score should be calculated or revalidated server-side.

---

# 23. Opponent review online

Anna sees:

- Board before/with proposed placement
- Proposed tiles
- Unknown word(s)
- Score if accepted
- Proposer identity
- `Godkänn`
- `Neka`

Anna does not see August's remaining rack.

Anna cannot edit August's placement.

---

# 24. Online acceptance

Anna sends:

```text
ACCEPT_PROPOSED_MOVE
```

The server:

1. Authenticates Anna.
2. Confirms Anna is the expected reviewer.
3. Confirms proposal is still unresolved.
4. Revalidates against authoritative state if needed.
5. Commits the move atomically.
6. Adds unknown words to accepted vocabulary.
7. Applies score.
8. Draws replacement tiles for August.
9. Advances normal turn to Anna.
10. Persists.
11. Returns updated player views.

---

# 25. Online rejection

Anna sends:

```text
REJECT_PROPOSED_MOVE
```

The server:

- Confirms Anna is the expected reviewer.
- Rejects the proposal.
- Does not award score.
- Does not draw replacement tiles.
- Does not add accepted vocabulary.
- Returns turn control to August.
- Preserves enough proposal placement data for August to continue editing if that is the chosen online UX.

---

# 26. Rejected placement online

The local rule says rejected tiles remain on the board for the proposer to adjust/remove.

Online, this should appear to August as a restored editable placement.

One implementation is:

```text
Server stores rejected pending placement
      ↓
August opens match
      ↓
Client receives own editable rejected placement
```

The rejected placement is private editing state after rejection and should not be mistaken for committed board occupancy.

---

# 27. Accepted vocabulary online

Accepted vocabulary remains scoped to one match.

Example:

```text
Match A:
    GRÖMP accepted

Match B:
    GRÖMP unknown
```

Accepting a word must never silently add it to:

- Global dictionary
- Other matches
- User account dictionary

A future feature could deliberately maintain personal word history, but that is separate.

---

# 28. Asynchronous play

The online game should work well asynchronously.

Players do not need to be connected simultaneously.

Example:

```text
August plays at 09:00
Anna opens match at 18:00
Anna responds
August continues next morning
```

This reduces the need for complex realtime infrastructure.

Persistent authoritative state is the priority.

---

# 29. Realtime updates

Realtime updates are still useful when both players happen to be online.

Potential implementation:

- Supabase Realtime
- WebSocket channel
- Another managed realtime mechanism

Use realtime as a notification/state-refresh mechanism.

Do not make correctness depend on both clients maintaining a live socket.

If a realtime message is missed, reopening/refetching the match must recover the correct authoritative state.

---

# 30. Optimistic UI

Be conservative with optimistic updates for authoritative game actions.

It is reasonable to make local tile arrangement instant.

It is less safe to optimistically assume:

- Move accepted
- Score awarded
- Turn advanced
- Unknown word accepted

For those actions, wait for server confirmation.

---

# 31. Concurrency

The server must handle stale or duplicate actions.

Examples:

- User double-clicks `Spela`.
- Opponent opens the same match in two tabs.
- An old browser tab submits after state changed.
- Realtime update arrives after a manual refresh.

Use a match revision/version or equivalent concurrency mechanism.

Conceptually:

```text
client action expects revision 42
server currently has revision 42
    → action may proceed

server currently has revision 43
    → reject as stale / require refresh
```

---

# 32. Idempotency

Critical actions should not produce duplicate effects.

Examples:

```text
Accept proposal twice
```

must not:

- Score twice
- Draw twice
- Advance two turns

Likewise:

```text
Submit same completed move twice
```

must not create duplicate commits.

Use state validation and, where appropriate, action/request IDs.

---

# 33. Database

The preferred future database direction is PostgreSQL.

Potential data areas include:

```text
users
profiles
friendships
game_invitations
matches
match_participants
game_state
chat_messages
notifications
```

The exact normalized schema should be designed in the online implementation phase.

Do not prematurely create database tables during Version 1.

---

# 34. Game-state persistence strategy

A practical future strategy is to persist the authoritative serialized game state per match, together with relational metadata.

Conceptually:

```text
matches
├── id
├── status
├── current_actor metadata
├── game_state JSON/JSONB
├── revision
├── created_at
└── updated_at
```

Relational tables can separately support:

- Match lists
- Friend queries
- Notifications
- Chat

Do not duplicate every engine field into relational columns unless queries require it.

---

# 35. Transactions

Actions that modify authoritative match state should be transactional.

For example, acceptance should not leave a state where:

```text
score updated
but
game state not advanced
```

or:

```text
move committed
but
replacement draw missing
```

The database write should treat the engine's resulting state as one authoritative transition.

---

# 36. API layer

The future server API should expose domain actions rather than arbitrary state writes.

Conceptual endpoints/actions might be:

```text
createMatch
acceptInvitation
getMatch
submitMove
confirmUnknownWordProposal
acceptProposedMove
rejectProposedMove
passTurn
exchangeTiles
sendChatMessage
```

Exact routing depends on the final backend architecture.

---

# 37. Authorization

Every online action must verify:

- User is authenticated.
- User participates in the match.
- User represents the player allowed to perform the action.
- Match is in the expected state.

Examples:

August must not be able to:

```text
accept his own proposal as Anna
```

or:

```text
read Anna's rack
```

Authorization must be server-side.

---

# 38. Match access

A user should only be able to access:

- Matches they participate in
- Public/spectator matches if such a feature is explicitly added later

Spectators are not required for the first online version.

Do not expose match IDs as sufficient authorization.

---

# 39. Chat

Each online match should eventually support simple text chat.

Conceptually:

```text
ChatMessage
├── id
├── matchId
├── senderUserId
├── text
└── createdAt
```

Chat is not part of `GameState`.

It should be stored separately.

---

# 40. Chat behaviour

Initial chat can be simple:

- Text only
- Chronological messages
- Visible only to match participants
- No file uploads
- No voice
- No reactions required

Keep chat moderation/security considerations in mind when the feature is implemented.

User-generated text must be safely rendered.

---

# 41. Notifications

Useful notifications include:

```text
Anna invited you to a match.
```

```text
It is your turn against Anna.
```

```text
Anna wants you to review an unknown word.
```

```text
Anna rejected your move.
```

```text
Your match against Anna has finished.
```

Notifications should be derived from authoritative events/state changes.

---

# 42. Notification channels

The first online version may only need in-app notifications.

Future options:

- Browser push
- Email
- Mobile push if a native wrapper/app exists later

Do not make push notifications a prerequisite for online multiplayer.

---

# 43. Match list badges

The match list should make required actions obvious.

For example:

```text
Din tur
    Anna
    Erik

Ord att granska
    Sara

Väntar på motståndaren
    Johan
```

A disputed-word review is not exactly a normal turn, so the UI should distinguish it.

---

# 44. Presence

Online/offline presence is optional.

The game is asynchronous, so knowing whether the opponent is currently online is not required for correctness.

Do not add presence infrastructure before it provides clear value.

---

# 45. Time limits

Turn timers are not part of the initial rules.

Future online play may optionally add:

- Match expiration
- Maximum inactivity period
- Timed game modes

These must be explicit rule variants rather than hidden infrastructure behaviour.

Do not automatically forfeit a player because of generic server timing.

---

# 46. Resignation

Online multiplayer will likely need a way to resign a match.

This should eventually become a formal engine/match action.

Conceptually:

```text
RESIGN
```

The exact scoring/result semantics should be defined before implementation.

Local Version 1 does not need this feature unless separately specified.

---

# 47. Blocking/reporting

Because friend and chat systems introduce user interaction, a production online version should eventually consider:

- Blocking users
- Reporting abuse
- Limiting unwanted invitations

These are social-platform concerns, not game-engine concerns.

They do not belong in Version 1.

---

# 48. Dictionary consistency

All online participants must use the same dictionary/rules configuration for a match.

The server is authoritative for:

```text
configurationId
dictionary version
tile configuration
board configuration
word rules
```

Clients must not determine legality using different dictionary versions.

Client-side dictionary lookup may be used for fast previews, but server validation decides the result.

---

# 49. Configuration version

Each online match should retain its configuration version.

For example:

```text
sv-alfapet-v1
```

If the dictionary changes later, ongoing matches should not silently change rules unless an explicit migration policy says so.

This preserves fairness and reproducibility.

---

# 50. Security boundaries

Never expose to the client:

- Database service-role credentials
- Authentication secrets
- Full opponent rack
- Full tile bag/draw order
- Hidden administrative data

Assume the browser client can be inspected and modified by the user.

Anything that must remain secret must remain server-side.

---

# 51. Rate limiting

When the online version becomes public, consider rate limits for:

- Login/authentication attempts
- User search
- Friend requests
- Invitations
- Chat messages
- Repeated match actions

This is not needed for local Version 1.

---

# 52. Auditability

Structured game history is useful for resolving bugs and disputes.

For important state changes, the server may retain:

- Action type
- Actor
- Match revision
- Resulting event
- Timestamp

Avoid logging private rack contents unnecessarily in general-purpose application logs.

---

# 53. Online testing

The online phase should add tests for:

### Authorization

```text
Non-participant cannot access match
```

```text
Opponent rack is never returned
```

```text
Wrong player cannot act
```

### Concurrency

```text
Stale revision rejected
```

```text
Duplicate acceptance does not double-score
```

### Persistence

```text
Committed move survives reconnect
```

```text
Awaiting approval survives reconnect
```

### Unknown words

```text
Proposal reaches correct opponent
```

```text
Acceptance commits atomically
```

```text
Rejection restores proposer control
```

### Match configuration

```text
All validation uses match dictionary version
```

---

# 54. Online end-to-end scenario

A critical future end-to-end test should be:

```text
August logs in
→ invites Anna
→ Anna accepts
→ match starts
→ August plays normal word
→ Anna sees it is her turn
→ Anna plays unknown word
→ confirms proposal
→ August sees review required
→ August rejects
→ Anna sees rejected placement
→ Anna edits placement
→ submits valid word
→ match continues
```

This validates the central mechanic across two authenticated users.

---

# 55. Migration from local mode

Do not attempt to automatically convert every local saved game into an online match in the first online release.

A simpler initial product model is:

```text
Local games
    remain local

Online games
    are created online
```

Importing local games can be considered later if there is demand.

---

# 56. Suggested implementation phases

After local Version 1 is stable, online development should proceed incrementally.

### Phase 1 — Backend foundation

- Database
- Authentication
- Profiles
- Server-side shared engine
- Match persistence

### Phase 2 — Direct online matches

- Create/invite match
- Match list
- Player-safe views
- Normal turn actions
- Reconnect/resume

### Phase 3 — Disputed-word flow

- Unknown proposal persistence
- Opponent review
- Acceptance/rejection
- Notifications/badges

### Phase 4 — Social layer

- Friends
- Friend requests
- Better invitations

### Phase 5 — Communication

- In-game chat
- In-app notifications
- Optional realtime updates

Do not implement all phases at once.

---

# 57. Technology direction

The current preferred direction is:

```text
Frontend:
    Existing Next.js / React app

Shared domain:
    Existing TypeScript game engine

Database:
    PostgreSQL

Possible managed platform:
    Supabase

Authentication:
    Managed authentication

Realtime:
    Added only where useful
```

These are architectural preferences, not immutable choices.

Reevaluate external services when the online phase begins.

---

# 58. Non-goals for the first online release

The first online version does not need:

- Public matchmaking
- Rankings
- Elo
- Tournaments
- Spectators
- Voice chat
- Video chat
- AI opponents
- Teams
- More than two players
- Native mobile apps
- Cross-game global accepted dictionary
- Complex moderation tooling
- Live presence indicators

Focus first on reliable friend-to-friend turn-based play.

---

# 59. Definition of done

The first online multiplayer version is successful when:

- Users can authenticate.
- Users can identify/invite an opponent.
- Two users can play the same match from separate devices.
- The server owns authoritative game state.
- Opponent racks and tile-bag contents remain private.
- Normal moves use the same shared game engine as local play.
- Unknown words can be proposed across devices.
- The correct opponent can accept or reject the complete move.
- Rejected placements return to the proposer for editing.
- Accepted unknown words remain valid for that match.
- Match state survives disconnects and page reloads.
- Multiple ongoing matches can be represented.
- Players can clearly see when it is their turn or when a word needs review.
- Basic in-game chat is available.
- The architecture remains maintainable and does not duplicate the game rules between client and server.
