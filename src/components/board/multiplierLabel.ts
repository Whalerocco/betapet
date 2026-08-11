import type { Multiplier } from "../../game/model/board";

export interface MultiplierLabel {
  readonly short: string;
  readonly full: string;
}

/**
 * Compact on-board abbreviation plus a full accessible name (ui-design.md section 45): the
 * short label alone must never be the only way to understand a square's meaning.
 */
export function getMultiplierLabel(
  multiplier: Multiplier,
): MultiplierLabel | undefined {
  switch (multiplier) {
    case "NONE":
      return undefined;
    case "LETTER_X2":
      return { short: "2B", full: "Dubbel bokstavspoäng" };
    case "LETTER_X3":
      return { short: "3B", full: "Tredubbel bokstavspoäng" };
    case "LETTER_X4":
      return { short: "4B", full: "Fyrdubbel bokstavspoäng" };
    case "LETTER_MINUS_X2":
      return { short: "-2B", full: "Minus dubbel bokstavspoäng" };
    case "WORD_X2":
      return { short: "2O", full: "Dubbelt ordvärde" };
    case "WORD_X3":
      return { short: "3O", full: "Tredubbelt ordvärde" };
    case "WORD_X4":
      return { short: "4O", full: "Fyrdubbelt ordvärde" };
    case "START":
      return { short: "★", full: "Startruta" };
  }
}
