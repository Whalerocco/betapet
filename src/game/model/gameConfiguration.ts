import type { BoardDefinition } from "./board";

export type RackSize = 6 | 7 | 8;

export interface GameConfiguration {
  readonly id: string;
  readonly language: string;
  readonly boardDefinition: BoardDefinition;
  readonly rackSize: RackSize;
}

export function createGameConfiguration(
  id: string,
  language: string,
  boardDefinition: BoardDefinition,
  rackSize: RackSize,
): GameConfiguration {
  if (id.trim().length === 0) {
    throw new Error("Configuration id must not be empty");
  }
  if (language.trim().length === 0) {
    throw new Error("Language must not be empty");
  }
  return { id, language, boardDefinition, rackSize };
}
