import { SWEDISH_CONFIGURATION_ID } from "@/game/configuration/swedishConfiguration";
import type { LanguageCode } from "@/game/model/language";
import { ALL_LANGUAGE_CODES } from "@/game/model/language";
import { ALL_MODIFIER_IDS, type ModifierId } from "@/game/model/modifiers";
import type { RackSize } from "@/game/model/gameConfiguration";

import type { MatchConfiguration } from "./db/schema";

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

function asStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.every((entry) => typeof entry === "string")
    ? (value as string[])
    : undefined;
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

export interface CreateMatchBody {
  readonly opponentEmail: string;
  readonly configuration: MatchConfiguration;
}

export function parseCreateMatch(body: unknown): CreateMatchBody | undefined {
  if (!isRecord(body)) return undefined;
  if (
    typeof body.opponentEmail !== "string" ||
    !body.opponentEmail.includes("@")
  ) {
    return undefined;
  }

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
    opponentEmail: body.opponentEmail,
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
