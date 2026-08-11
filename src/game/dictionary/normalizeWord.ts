/**
 * Canonical word normalization for dictionary lookup (dictionary.md section 6): uppercase,
 * trimmed, Unicode-NFC. Swedish letters (Å, Ä, Ö) are preserved as first-class, distinct
 * letters — never folded to A/O.
 *
 * Formalizing one shared normalization path for dictionary lookup, accepted vocabulary, word
 * comparison, and history is a later milestone (roadmap.md Milestone 2.1); this covers what
 * dictionary lookup needs today.
 */
export function normalizeWord(word: string): string {
  return word.trim().normalize("NFC").toUpperCase();
}
