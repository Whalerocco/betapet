import exclusions from "../../data/dictionary/sv-saldo-exclusions.json";

/**
 * Words derived from SALDO/SALDOM part-of-speech tagging as exclusively proper nouns or
 * exclusively abbreviations (see scripts/preprocess-dictionary.ts for how these are derived,
 * and src/data/dictionary/SOURCE.md for known limitations). A word with any ordinary sense is
 * not included here, even if it also has a proper-noun/abbreviation sense.
 */
export interface SwedishExclusions {
  readonly properNounOnly: ReadonlySet<string>;
  readonly abbreviationOnly: ReadonlySet<string>;
}

export function loadSwedishExclusions(): SwedishExclusions {
  return {
    properNounOnly: new Set(exclusions.properNounOnly),
    abbreviationOnly: new Set(exclusions.abbreviationOnly),
  };
}
