import { SWEDISH_ALPHABET } from "@/game/configuration/swedishAlphabet";
import { createSwedishGameConfiguration } from "@/game/configuration/swedishConfiguration";
import type { GameControllerDependencies } from "@/application/game-controller/gameController";
import {
  loadLanguageClassificationRules,
  loadLanguageClassificationRulesFor,
} from "@/application/language/loadLanguageClassificationRules";

import type { MatchConfiguration } from "./db/schema";

/**
 * Rebuilds what the engine needs to judge a move, from the rules a match was created with.
 *
 * A match stores the selection a player made, not the built configuration (DEC-023), so this is
 * where the two meet. It matters that it is rebuilt rather than stored: the board definition and
 * the dictionaries are code, and a match that carried its own copy would keep playing by a
 * snapshot of them.
 *
 * Dictionaries are megabytes each (DEC-011), so the result is memoized per distinct set of rules.
 * A server process handles many matches, and most of them share one configuration.
 */
const cache = new Map<string, Promise<GameControllerDependencies>>();

function cacheKey(configuration: MatchConfiguration): string {
  return JSON.stringify([
    configuration.configurationId,
    configuration.rackSize,
    [...configuration.modifiers].sort(),
    configuration.polyglotLanguages,
    configuration.wildLanguages,
  ]);
}

async function build(
  configuration: MatchConfiguration,
): Promise<GameControllerDependencies> {
  const modifiers = new Set(configuration.modifiers);

  const gameConfiguration = createSwedishGameConfiguration(
    configuration.rackSize,
    modifiers,
    configuration.polyglotLanguages,
    configuration.wildLanguages,
  );

  return {
    configuration: gameConfiguration,
    classificationRules: await loadLanguageClassificationRules("sv"),
    polyglotClassificationRules: modifiers.has("POLYGLOT")
      ? await loadLanguageClassificationRulesFor(
          configuration.polyglotLanguages,
        )
      : undefined,
    wildClassificationRules: modifiers.has("WILD")
      ? await loadLanguageClassificationRulesFor(configuration.wildLanguages)
      : undefined,
    alphabet: SWEDISH_ALPHABET,
  };
}

export function dependenciesFor(
  configuration: MatchConfiguration,
): Promise<GameControllerDependencies> {
  const key = cacheKey(configuration);
  const existing = cache.get(key);
  if (existing) return existing;

  const built = build(configuration);
  cache.set(key, built);
  return built;
}
