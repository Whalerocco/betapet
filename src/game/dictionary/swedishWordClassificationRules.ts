import type { WordClassificationRules } from "./classifyWord";
import { ALLOWED_ABBREVIATIONS } from "./allowedAbbreviations";
import { ALLOWED_COUNTRIES } from "./allowedCountries";
import { ALLOWED_MONTHS } from "./allowedMonths";
import { ALLOWED_WEEKDAYS } from "./allowedWeekdays";
import { createSwedishDictionary } from "./swedishDictionary";
import { loadSwedishExclusions } from "./swedishExclusions";

export function createSwedishWordClassificationRules(): WordClassificationRules {
  const exclusions = loadSwedishExclusions();
  return {
    dictionary: createSwedishDictionary(),
    properNounOnly: exclusions.properNounOnly,
    abbreviationOnly: exclusions.abbreviationOnly,
    allowedCountries: ALLOWED_COUNTRIES,
    allowedMonths: ALLOWED_MONTHS,
    allowedWeekdays: ALLOWED_WEEKDAYS,
    allowedAbbreviations: ALLOWED_ABBREVIATIONS,
  };
}
