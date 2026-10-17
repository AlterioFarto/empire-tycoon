import type { DiceRoll } from '@monopoly/shared';

export interface DiceProvider {
  roll(): DiceRoll;
}

export class RandomDice implements DiceProvider {
  roll(): DiceRoll {
    const die1 = rollSingle();
    const die2 = rollSingle();
    return {
      die1,
      die2,
      isDoubles: die1 === die2,
      total: die1 + die2,
    };
  }
}

export function rollSingle(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function createDiceRoll(die1: number, die2: number): DiceRoll {
  const d1 = Math.min(6, Math.max(1, Math.floor(die1)));
  const d2 = Math.min(6, Math.max(1, Math.floor(die2)));
  return {
    die1: d1,
    die2: d2,
    isDoubles: d1 === d2,
    total: d1 + d2,
  };
}

export function isDoubles(roll: DiceRoll): boolean {
  return roll.isDoubles;
}
