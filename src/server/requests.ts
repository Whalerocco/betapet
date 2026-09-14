import { SWEDISH_CONFIGURATION_ID } from "@/game/configuration/swedishConfiguration";
import type { Coordinate } from "@/game/model/coordinate";
import type { TileId } from "@/game/model/ids";
import type { LanguageCode } from "@/game/model/language";
import { ALL_LANGUAGE_CODES } from "@/game/model/language";
import { ALL_MODIFIER_IDS, type ModifierId } from "@/game/model/modifiers";
import type { RackSize } from "@/game/model/gameConfiguration";

import type { MatchConfiguration } from "./db/schema";
import { parseHandle } from "./handles";
import type { TurnAction } from "./matchActions";

/**
 * Turning request bodies into the types the action layer works with.
 *
 * The server assumes a client can send anything at all (`online-multiplayer.md` section 50), so a
 * body is checked field by field rather than cast. What these do *not* check is anything about
 * game rules: whether a tile is on the player's rack, or a square is free, is the engine's
 * judgment and is made against the authoritative state, not against a request.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asCoordinate(value: unknown): Coordinate | undefined {
  if (!isRecord(value)) return undefined;
  const { row, column } = value;
  if (!Number.isInteger(row) || !Number.isInteger(column)) return undefined;
  return { row: row as number, column: column as number };
}

function asStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.every((entry) => typeof entry === "string")
    ? (value as string[])
    : undefined;
}

export function parseTurnAction(body: unknown): TurnAction | undefined {
  if (!isRecord(body)) return undefined;

  switch (body.type) {
    case "PASS":
      return { type: "PASS" };
    case "CLEAR_PENDING_MOVE":
      return { type: "CLEAR_PENDING_MOVE" };

    // The disputed-word actions carry nothing but their name: which player may send each is the
    // engine's judgment, made against the stored proposal (`online-multiplayer.md` section 24).
    case "CONFIRM_PROPOSAL":
    case "CANCEL_PROPOSAL":
    case "ACCEPT_PROPOSED_MOVE":
    case "REJECT_PROPOSED_MOVE":
      return { type: body.type };

    case "EXCHANGE_TILES": {
      const tileIds = asStringArray(body.tileIds);
      return tileIds
        ? { type: "EXCHANGE_TILES", tileIds: tileIds as TileId[] }
        : undefined;
    }

    case "SUBMIT_MOVE": {
      if (!Array.isArray(body.placements)) return undefined;

      const placements = [];
      for (const entry of body.placements) {
        if (!isRecord(entry) || typeof entry.tileId !== "string")
          return undefined;
        const coordinate = asCoordinate(entry.coordinate);
        if (!coordinate) return undefined;
        if (
          entry.representedLetter !== undefined &&
          typeof entry.representedLetter !== "string"
        ) {
          return undefined;
        }
        placements.push({
          tileId: entry.tileId as TileId,
          coordinate,
          representedLetter: entry.representedLetter,
        });
      }
      return { type: "SUBMIT_MOVE", placements };
    }

    default:
      return undefined;
  }
}

const RACK_SIZES: readonly RackSize[] = [6, 7, 8];

function asLanguages(value: unknown): readonly LanguageCode[] | undefined {
  const codes = asStringArray(value);
  if (!codes) return undefined;
  return codes.every((code) =>
    (ALL_LANGUAGE_CODES as readonly string[]).includes(code),
  )
    ? (codes as LanguageCode[])
    : undefined;
}

/**
 * Who the invitation is for.
 *
 * An email address is how an opponent was named before there were friends (T25.1) and still is
 * for somebody who is not one. A friend is named by id instead, because the friend list already
 * holds it and a friend's email is not the interface's business — the server only accepts an id
 * from a user who is actually a friend of it (T28.3).
 */
export type OpponentReference =
  | { readonly kind: "EMAIL"; readonly email: string }
  | { readonly kind: "USER_ID"; readonly userId: string };

export interface CreateMatchBody {
  readonly opponent: OpponentReference;
  readonly configuration: MatchConfiguration;
}

function asOpponent(
  body: Record<string, unknown>,
): OpponentReference | undefined {
  // Exactly one of the two, so a body naming both cannot leave the server choosing.
  const hasEmail = typeof body.opponentEmail === "string";
  const hasUserId = typeof body.opponentUserId === "string";
  if (hasEmail === hasUserId) return undefined;

  if (hasEmail) {
    const email = (body.opponentEmail as string).trim();
    return email.includes("@") ? { kind: "EMAIL", email } : undefined;
  }

  const userId = (body.opponentUserId as string).trim();
  return userId.length > 0 ? { kind: "USER_ID", userId } : undefined;
}

export function parseCreateMatch(body: unknown): CreateMatchBody | undefined {
  if (!isRecord(body)) return undefined;

  const opponent = asOpponent(body);
  if (!opponent) return undefined;

  const configuration = isRecord(body.configuration) ? body.configuration : {};

  const rackSize = configuration.rackSize ?? 7;
  if (!RACK_SIZES.includes(rackSize as RackSize)) return undefined;

  const modifiers = asStringArray(configuration.modifiers ?? []);
  if (
    !modifiers ||
    !modifiers.every((id) =>
      (ALL_MODIFIER_IDS as readonly string[]).includes(id),
    )
  ) {
    return undefined;
  }

  const polyglotLanguages = asLanguages(configuration.polyglotLanguages ?? []);
  const wildLanguages = asLanguages(configuration.wildLanguages ?? []);
  if (!polyglotLanguages || !wildLanguages) return undefined;

  return {
    opponent,
    configuration: {
      // Swedish Alfapet is the only ruleset the first online release offers
      // (`online-multiplayer.md` section 12); the field exists so a match keeps playing by the
      // rules it started with (section 49), not so a client can choose another.
      configurationId: SWEDISH_CONFIGURATION_ID,
      rackSize: rackSize as RackSize,
      modifiers: modifiers as ModifierId[],
      polyglotLanguages,
      wildLanguages,
    },
  };
}

export interface FriendRequestBody {
  /** Normalized and validated: `@Anna` and `anna` arrive here as `anna` (DEC-027). */
  readonly handle: string;
}

export function parseFriendRequest(
  body: unknown,
): FriendRequestBody | undefined {
  if (!isRecord(body)) return undefined;
  const handle = parseHandle(body.handle);
  return handle ? { handle } : undefined;
}

export interface ChatMessageBody {
  /** Not trimmed here: `sendMessage` owns what an empty or overlong message is (T29.1). */
  readonly text: string;
}

/**
 * A chat message, checked only for being a string.
 *
 * What counts as empty and what counts as too long are decided once, in `chat.ts`, so that a
 * caller cannot get a different answer depending on which way it reached the server.
 */
export function parseChatMessage(body: unknown): ChatMessageBody | undefined {
  if (!isRecord(body)) return undefined;
  return typeof body.text === "string" ? { text: body.text } : undefined;
}
