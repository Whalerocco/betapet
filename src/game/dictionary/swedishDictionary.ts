import swedishWords from "../../data/dictionary/sv-saldo-words.json";
import { createDictionary, type Dictionary } from "./dictionary";

/**
 * The SALDO/SALDOM-derived Swedish word list (src/data/dictionary/SOURCE.md). Not yet filtered
 * for proper names, place names, or abbreviations — see roadmap.md Milestone 2.2.
 */
export function createSwedishDictionary(): Dictionary {
  return createDictionary(swedishWords);
}
