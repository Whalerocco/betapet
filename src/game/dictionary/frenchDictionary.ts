import frenchWords from "../../data/dictionary/fr-lexique383-words.json";
import { createDictionary, type Dictionary } from "./dictionary";

/**
 * The Lexique383-derived French word list (src/data/dictionary/SOURCE-fr.md).
 * Unlike Swedish's SALDO source, this list already excludes proper names, place names, and
 * abbreviations by its own scope (Lexique383 is a common-vocabulary lexicon, not a name
 * gazetteer) — see SOURCE-fr.md.
 */
export function createFrenchDictionary(): Dictionary {
  return createDictionary(frenchWords);
}
