import type { WordClassificationRules } from "./classifyWord";
import { ALLOWED_ABBREVIATIONS_EN } from "./allowedAbbreviationsEn";
import { ALLOWED_COUNTRIES_EN } from "./allowedCountriesEn";
import { ALLOWED_MONTHS_EN } from "./allowedMonthsEn";
import { ALLOWED_WEEKDAYS_EN } from "./allowedWeekdaysEn";
import { createEnglishDictionary } from "./englishDictionary";

/**
 * Like German and French, the English source carries no part-of-speech tagging to derive
 * proper-noun/abbreviation exclusions from (SOURCE-en.md) — ENABLE was compiled specifically as
 * a Scrabble word source and already excludes those categories, so both sets start empty here.
 */
export function createEnglishWordClassificationRules(): WordClassificationRules {
  return {
    dictionary: createEnglishDictionary(),
    properNounOnly: new Set(),
    abbreviationOnly: new Set(),
    allowedCountries: ALLOWED_COUNTRIES_EN,
    allowedMonths: ALLOWED_MONTHS_EN,
    allowedWeekdays: ALLOWED_WEEKDAYS_EN,
    allowedAbbreviations: ALLOWED_ABBREVIATIONS_EN,
  };
}
