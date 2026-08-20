import germanWords from "../../data/dictionary/de-hippler-words.json";
import { createDictionary, type Dictionary } from "./dictionary";

/**
 * The hippler/german-wordlist-derived German word list (src/data/dictionary/SOURCE-de.md).
 * Unlike Swedish's SALDO source, this list already excludes proper names, place names, and
 * abbreviations by its own curation policy — see SOURCE-de.md.
 */
export function createGermanDictionary(): Dictionary {
  return createDictionary(germanWords);
}
