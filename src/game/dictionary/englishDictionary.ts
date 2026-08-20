import englishWords from "../../data/dictionary/en-enable-words.json";
import { createDictionary, type Dictionary } from "./dictionary";

/**
 * The ENABLE-derived English word list (src/data/dictionary/SOURCE-en.md).
 * Unlike Swedish's SALDO source, this list already excludes proper names, place names, and
 * abbreviations by its own curation policy — it was compiled specifically as a Scrabble word
 * source — see SOURCE-en.md.
 */
export function createEnglishDictionary(): Dictionary {
  return createDictionary(englishWords);
}
