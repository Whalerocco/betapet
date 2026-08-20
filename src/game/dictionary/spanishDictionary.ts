import spanishWords from "../../data/dictionary/es-eswiktionary-words.json";
import { createDictionary, type Dictionary } from "./dictionary";

/**
 * The Spanish-Wiktionary-via-Wiktextract-derived word list
 * (src/data/dictionary/SOURCE-es.md). Not yet filtered for proper names or abbreviations —
 * see spanishExclusions.ts / spanishWordClassificationRules.ts for that layer, the same
 * separation Swedish uses.
 */
export function createSpanishDictionary(): Dictionary {
  return createDictionary(spanishWords);
}
