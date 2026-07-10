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
  return {
    die1,
    die2,
    isDoubles: die1 === die2,
    total: die1 + die2,
  };
}

export function isDoubles(roll: DiceRoll): boolean {
  return roll.isDoubles;
}
