import { describe, it, expect } from 'vitest';
import {
  createTurnState, setPhase, setDiceRoll, markBoughtProperty, markDrawnCard,
  canRollDice, canEndTurn, hasThirdDouble,
} from '../src/turn/turn.js';
import { createDiceRoll } from '../src/dice/dice.js';

describe('Turn', () => {
  it('should create turn state in waiting-to-roll phase', () => {
    const turn = createTurnState('p1');
    expect(turn.playerId).toBe('p1');
    expect(turn.phase).toBe('waiting-to-roll');
  });

  it('should allow rolling in waiting-to-roll phase', () => {
    const turn = createTurnState('p1');
    expect(canRollDice(turn)).toBe(true);
    expect(canEndTurn(turn)).toBe(false);
  });

  it('should allow ending turn in optional-actions phase', () => {
    const turn = createTurnState('p1');
    const withActions = setPhase(turn, 'optional-actions');
    expect(canEndTurn(withActions)).toBe(true);
  });

  it('should track dice roll', () => {
    const turn = createTurnState('p1');
    const roll = createDiceRoll(4, 2);
    const withRoll = setDiceRoll(turn, roll);
    expect(withRoll.diceRoll).toEqual(roll);
    expect(withRoll.movesRemaining).toBe(6);
    expect(withRoll.doublesCount).toBe(0);
  });

  it('should track doubles count', () => {
    const turn = createTurnState('p1');
    const roll = createDiceRoll(3, 3);
    const withRoll = setDiceRoll(turn, roll);
    expect(withRoll.doublesCount).toBe(1);
  });

  it('should detect third double', () => {
    const turn = createTurnState('p1');
    const roll = createDiceRoll(3, 3);
    const one = setDiceRoll(turn, roll);
    expect(hasThirdDouble(one)).toBe(false);
    const two = setDiceRoll(one, roll);
    expect(hasThirdDouble(two)).toBe(false);
    const three = setDiceRoll(two, roll);
    expect(hasThirdDouble(three)).toBe(true);
  });

  it('should mark bought property', () => {
    const turn = createTurnState('p1');
    const marked = markBoughtProperty(turn);
    expect(marked.hasBoughtProperty).toBe(true);
  });

  it('should mark drawn card', () => {
    const turn = createTurnState('p1');
    const marked = markDrawnCard(turn);
    expect(marked.hasDrawnCard).toBe(true);
  });
});
