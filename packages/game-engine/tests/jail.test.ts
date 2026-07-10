import { describe, it, expect } from 'vitest';
import {
  canPayJailFine, canUseJailCard, payJailFine, useJailCard,
  processJailRoll, getJailOptions,
} from '../src/jail/jail.js';
import { createDiceRoll } from '../src/dice/dice.js';
import { createPlayer } from '../src/player/player.js';
import { JAIL_FINE, MAX_TURNS_WITHOUT_DOUBLES_IN_JAIL } from '@monopoly/shared';

describe('Jail', () => {
  it('should check if player can pay fine', () => {
    const rich = createPlayer('p1', 'Rich', 'red', 1500, 0);
    expect(canPayJailFine(rich)).toBe(true);

    const poor = createPlayer('p2', 'Poor', 'blue', 10, 0);
    expect(canPayJailFine(poor)).toBe(false);
  });

  it('should check if player can use jail card', () => {
    const withCard = createPlayer('p1', 'Card', 'red', 1500, 0);
    const hasCard = { ...withCard, getOutOfJailCards: 1 };
    expect(canUseJailCard(hasCard)).toBe(true);

    const noCard = createPlayer('p2', 'NoCard', 'blue', 1500, 0);
    expect(canUseJailCard(noCard)).toBe(false);
  });

  it('should pay jail fine', () => {
    const player = createPlayer('p1', 'Test', 'red', 1500, 0);
    const jailed = { ...player, inJail: true, jailTurns: 1 };
    const result = payJailFine(jailed);
    expect(result.money).toBe(1500 - JAIL_FINE);
    expect(result.inJail).toBe(false);
    expect(result.jailTurns).toBe(0);
  });

  it('should use jail card', () => {
    const player = createPlayer('p1', 'Test', 'red', 1500, 0);
    const jailed = { ...player, inJail: true, jailTurns: 1, getOutOfJailCards: 1 };
    const result = useJailCard(jailed);
    expect(result.inJail).toBe(false);
    expect(result.jailTurns).toBe(0);
    expect(result.getOutOfJailCards).toBe(0);
  });

  it('should release on doubles roll', () => {
    const player = createPlayer('p1', 'Test', 'red', 1500, 0);
    const jailed = { ...player, inJail: true, jailTurns: 1 };
    const roll = createDiceRoll(3, 3);
    const result = processJailRoll(jailed, roll);
    expect(result.action).toBe('rolled');
    expect(result.rolledDoubles).toBe(true);
    expect(result.player.inJail).toBe(false);
  });

  it('should force pay fine after 3 turns without doubles', () => {
    const player = createPlayer('p1', 'Test', 'red', 1500, 0);
    const jailed = { ...player, inJail: true, jailTurns: MAX_TURNS_WITHOUT_DOUBLES_IN_JAIL - 1 };
    const roll = createDiceRoll(2, 3); // not doubles
    const result = processJailRoll(jailed, roll);
    expect(result.action).toBe('paid');
    expect(result.player.inJail).toBe(false);
  });

  it('should stay in jail if no doubles and turns remaining', () => {
    const player = createPlayer('p1', 'Test', 'red', 1500, 0);
    const jailed = { ...player, inJail: true, jailTurns: 0 };
    const roll = createDiceRoll(2, 3); // not doubles
    const result = processJailRoll(jailed, roll);
    expect(result.action).toBe('stayed');
    expect(result.player.inJail).toBe(true);
    expect(result.player.jailTurns).toBe(1);
  });

  it('should provide jail options', () => {
    const player = createPlayer('p1', 'Test', 'red', 1500, 0);
    const jailed = { ...player, inJail: true, getOutOfJailCards: 1 };
    const options = getJailOptions(jailed);
    expect(options).toContain('pay');
    expect(options).toContain('card');
    expect(options).toContain('roll');
  });
});
