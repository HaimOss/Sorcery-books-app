export type GameClass = 'Warrior' | 'Sorcerer';

export interface Stats {
  current: number;
  max: number;
}

export interface CharacterState {
  name: string;
  bookName: string;
  class: GameClass | null;
  skill: Stats;
  stamina: Stats;
  luck: Stats;
  gold: number;
  provisions: number;
  items: string[];
  libraUsed: boolean;
  notes: string;
  day: number;
}

export interface LogEntry {
  id: string;
  paragraph: string;
  note: string;
  timestamp: number;
  snapshot: CharacterState;
}

export interface GameState {
  character: CharacterState;
  log: LogEntry[];
  isInitialized: boolean;
}

export interface Monster {
  id: string;
  name: string;
  skill: number;
  stamina: number;
}
