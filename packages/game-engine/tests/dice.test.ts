import { describe, it, expect } from 'vitest';
import { RandomDice, createDiceRoll, isDoubles } from '../src/dice/dice.js';

describe('Dice', () => {
  it('should roll two dice with values 1-6', () => {
    const dice = new RandomDice();
    for (let i = 0; i < 100; i++) {
      const roll = dice.roll();
      expect(roll.die1).toBeGreaterThanOrEqual(1);
      expect(roll.die1).toBeLessThanOrEqual(6);
      expect(roll.die2).toBeGreaterThanOrEqual(1);
      expect(roll.die2).toBeLessThanOrEqual(6);
    }
  });

  it('should correctly identify doubles', () => {
    const doubles = createDiceRoll(3, 3);
    expect(doubles.isDoubles).toBe(true);
    expect(doubles.total).toBe(6);

    const nonDoubles = createDiceRoll(3, 4);
    expect(nonDoubles.isDoubles).toBe(false);
    expect(nonDoubles.total).toBe(7);
  });

  it('should detect doubles with isDoubles function', () => {
    expect(isDoubles(createDiceRoll(1, 1))).toBe(true);
    expect(isDoubles(createDiceRoll(6, 6))).toBe(true);
    expect(isDoubles(createDiceRoll(1, 2))).toBe(false);
  });
});
