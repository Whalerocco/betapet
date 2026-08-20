import exclusions from "../../data/dictionary/es-eswiktionary-exclusions.json";

/**
 * Words derived from the Spanish Wiktionary source's `pos` field as exclusively proper nouns
 * (`pos: "name"`) or exclusively abbreviations (`pos: "abbrev"`) (see
 * scripts/preprocess-spanish-dictionary.ts for how these are derived, and
 * src/data/dictionary/SOURCE-es.md for detail). A word with any ordinary sense is not included
 * here, even if it also has a proper-noun/abbreviation sense — the same rule Swedish uses.
 */
export interface SpanishExclusions {
  readonly properNounOnly: ReadonlySet<string>;
  readonly abbreviationOnly: ReadonlySet<string>;
}

export function loadSpanishExclusions(): SpanishExclusions {
  return {
    properNounOnly: new Set(exclusions.properNounOnly),
    abbreviationOnly: new Set(exclusions.abbreviationOnly),
  };
}
