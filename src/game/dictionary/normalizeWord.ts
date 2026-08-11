/**
 * The one canonical word normalization path (dictionary.md sections 6-7): uppercase, trimmed,
 * Unicode-NFC. Swedish letters (Å, Ä, Ö) are preserved as first-class, distinct letters — never
 * folded to A/O.
 *
 * Every part of the game that needs to compare words for equality must normalize through this
 * function rather than reimplementing the rule: dictionary lookup, accepted vocabulary, word
 * comparison, and move history (dictionary.md section 6, section 38).
 */
export function normalizeWord(word: string): string {
  return word.trim().normalize("NFC").toUpperCase();
}
