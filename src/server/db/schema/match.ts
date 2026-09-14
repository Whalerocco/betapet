import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import type { GameState } from "@/game/model/game";
import type { LanguageCode } from "@/game/model/language";
import type { ModifierId } from "@/game/model/modifiers";
import type { RackSize } from "@/game/model/gameConfiguration";
import type { PlayerId } from "@/game/model/ids";

import { user } from "./auth";

/**
 * The match wrapper's status (`online-multiplayer.md` section 15).
 *
 * This is the social/lifecycle status of the match, and is not the engine's own `GameStatus`.
 * The document is explicit that the two must not be confused: a match is `ACTIVE` from the moment
 * the invitation is accepted, while the engine inside it moves through SETUP, ACTIVE and FINISHED
 * on its own terms.
 */
export const matchStatus = pgEnum("match_status", [
  "INVITED",
  "ACTIVE",
  "FINISHED",
  "CANCELLED",
]);

export type MatchStatus = (typeof matchStatus.enumValues)[number];

/**
 * The rules a match was created with, kept so that a match plays by them for its whole life
 * (`online-multiplayer.md` section 49: a later dictionary or rule change must not silently alter
 * a game in progress).
 *
 * This is the selection a player makes before a game starts, not the built `GameConfiguration` —
 * that one carries a whole board definition and a `Set`, neither of which belongs in a column.
 * The fields deliberately mirror `SavedLocalGame` in `src/application/persistence/localGameStorage.ts`;
 * the two stores should share one type once T25 builds match creation and both can be changed
 * together.
 */
export interface MatchConfiguration {
  readonly configurationId: string;
  readonly rackSize: RackSize;
  /** Serialized as an array — `Set` is not JSON-serializable. */
  readonly modifiers: readonly ModifierId[];
  /** Only meaningful when `modifiers` contains "POLYGLOT". */
  readonly polyglotLanguages: readonly LanguageCode[];
  /** Ordered rotation; only meaningful when `modifiers` contains "WILD". */
  readonly wildLanguages: readonly LanguageCode[];
}

/**
 * What the match is waiting for, when it is waiting for somebody.
 *
 * Playing and reviewing are different demands on a player and the match list shows them
 * separately — `Din tur` against `Ord att granska` (`tasks.md` T27.1) — so the column that says
 * *who* must act is paired with one that says *what* they must do.
 */
export const matchPendingAction = pgEnum("match_pending_action", [
  "PLAY",
  "REVIEW",
]);

export type MatchPendingAction = (typeof matchPendingAction.enumValues)[number];

export const match = pgTable(
  "match",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: matchStatus("status").notNull().default("INVITED"),

    /**
     * Guards against stale and duplicate actions (`online-multiplayer.md` section 31): a client
     * submits the revision it believes it is acting on, and the write only lands if the database
     * still holds that revision.
     *
     * This is not `GameState.version`, which is the serialized format's schema version
     * (`content-model.md` section 6) and does not change as a game is played.
     */
    revision: integer("revision").notNull().default(1),

    /**
     * The authoritative serialized game state (`online-multiplayer.md` section 34).
     *
     * Null until the invitation is accepted, because a game does not exist before then
     * (section 13). Everything the engine needs is in here rather than spread across columns;
     * section 34 asks for exactly that, and warns against duplicating engine fields into columns
     * no query needs.
     */
    gameState: jsonb("game_state").$type<GameState>(),

    /** Kept as a column as well as inside `configuration`, so a future rule migration can find
     * every match on a given ruleset without reading each row's JSON. */
    configurationId: text("configuration_id").notNull(),
    configuration: jsonb("configuration").$type<MatchConfiguration>().notNull(),

    /**
     * Who the match is waiting for, denormalized from the game state so the match list can be
     * built with one query per user rather than by deserializing every match
     * (`online-multiplayer.md` sections 14 and 34). Null while a match is INVITED or once it has
     * finished.
     *
     * This is taken from the turn state rather than from `currentPlayerId`, because the two part
     * company exactly when it matters: while a proposed word is awaiting review, the current
     * player is still the proposer, but the person who must act is the reviewer.
     */
    currentActorUserId: text("current_actor_user_id").references(
      () => user.id,
      { onDelete: "set null" },
    ),

    /** Whether the waiting player owes a move or a verdict on a proposed word. */
    pendingAction: matchPendingAction("pending_action"),

    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    /** When a player last acted, as opposed to when the row last changed. */
    lastActionAt: timestamp("last_action_at", { withTimezone: true }),
  },
  (table) => [
    index("match_current_actor_idx").on(table.currentActorUserId),
    index("match_status_idx").on(table.status),
  ],
);

/**
 * Which user plays as which player within one match — the `User` versus `Player` distinction of
 * `online-multiplayer.md` section 8, and the table every authorization check leans on
 * (sections 37-38).
 *
 * `playerId` is the engine's own id for a seat within the game state, so a row here is what turns
 * "this user" into "this player" and back.
 */
export const matchPlayer = pgTable(
  "match_player",
  {
    matchId: uuid("match_id")
      .notNull()
      .references(() => match.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    playerId: text("player_id").$type<PlayerId>().notNull(),

    /**
     * The match revision this user had seen the last time they opened it (T30.1).
     *
     * The only piece of a notification that is not derivable from the game itself: everything a
     * player still owes — their turn, a word to review, an invitation — stops being true the
     * moment they act, but "your match against Anna has finished" is true forever and would
     * otherwise be reported forever. Comparing this against `match.revision` is what makes a
     * finished match stop asking to be looked at, and it uses a column the list already reads
     * rather than needing the game state deserialized.
     *
     * Null for a seat whose user has never opened the match.
     */
    lastSeenRevision: integer("last_seen_revision"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.matchId, table.playerId] }),
    // One seat per user per match: a user cannot play both sides of the same game.
    unique("match_player_user_unique").on(table.matchId, table.userId),
    // The match list is "every match this user is in", so it is queried by user.
    index("match_player_user_idx").on(table.userId),
  ],
);

export const matchRelations = relations(match, ({ many }) => ({
  players: many(matchPlayer),
}));

export const matchPlayerRelations = relations(matchPlayer, ({ one }) => ({
  match: one(match, {
    fields: [matchPlayer.matchId],
    references: [match.id],
  }),
  user: one(user, {
    fields: [matchPlayer.userId],
    references: [user.id],
  }),
}));
