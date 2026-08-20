import type { WordClassificationRules } from "./classifyWord";
import { ALLOWED_ABBREVIATIONS_ES } from "./allowedAbbreviationsEs";
import { ALLOWED_COUNTRIES_ES } from "./allowedCountriesEs";
import { ALLOWED_MONTHS_ES } from "./allowedMonthsEs";
import { ALLOWED_WEEKDAYS_ES } from "./allowedWeekdaysEs";
import { createSpanishDictionary } from "./spanishDictionary";
import { loadSpanishExclusions } from "./spanishExclusions";

/**
 * Unlike German/French/English, the Spanish source's `pos` field does support deriving real
 * proper-noun/abbreviation exclusions (SOURCE-es.md), the same as Swedish's SALDO tags — so this
 * loads spanishExclusions.ts rather than starting from empty sets.
 */
export function createSpanishWordClassificationRules(): WordClassificationRules {
  const exclusions = loadSpanishExclusions();
  return {
    dictionary: createSpanishDictionary(),
    properNounOnly: exclusions.properNounOnly,
    abbreviationOnly: exclusions.abbreviationOnly,
    allowedCountries: ALLOWED_COUNTRIES_ES,
    allowedMonths: ALLOWED_MONTHS_ES,
    allowedWeekdays: ALLOWED_WEEKDAYS_ES,
    allowedAbbreviations: ALLOWED_ABBREVIATIONS_ES,
  };
}
