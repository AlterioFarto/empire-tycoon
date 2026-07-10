import { describe, it, expect } from 'vitest';
import {
  createPlayer, addMoney, deductMoney, movePlayer, addProperty, removeProperty,
  addJailCard, removeJailCard, sendToJail, releaseFromJail, incrementJailTurn,
  setBankrupt, canAfford,
} from '../src/player/player.js';

describe('Player', () => {
  it('should create a player with initial state', () => {
    const player = createPlayer('p1', 'Alice', 'red', 1500, 0);
    expect(player.id).toBe('p1');
    expect(player.name).toBe('Alice');
    expect(player.color).toBe('red');
    expect(player.money).toBe(1500);
    expect(player.position).toBe(0);
    expect(player.properties).toEqual([]);
    expect(player.inJail).toBe(false);
    expect(player.bankrupt).toBe(false);
  });

  it('should add money correctly', () => {
    const player = createPlayer('p1', 'Alice', 'red', 1500, 0);
    const updated = addMoney(player, 200);
    expect(updated.money).toBe(1700);
  });

  it('should deduct money correctly', () => {
    const player = createPlayer('p1', 'Alice', 'red', 1500, 0);
    const updated = deductMoney(player, 500);
    expect(updated.money).toBe(1000);
  });

  it('should move player', () => {
    const player = createPlayer('p1', 'Alice', 'red', 1500, 0);
    const updated = movePlayer(player, 15);
    expect(updated.position).toBe(15);
  });

  it('should add and remove properties', () => {
    const player = createPlayer('p1', 'Alice', 'red', 1500, 0);
    const withProp = addProperty(player, 'property-1');
    expect(withProp.properties).toEqual(['property-1']);

    const withoutProp = removeProperty(withProp, 'property-1');
    expect(withoutProp.properties).toEqual([]);
  });

  it('should track jail cards', () => {
    const player = createPlayer('p1', 'Alice', 'red', 1500, 0);
    const withCard = addJailCard(player);
    expect(withCard.getOutOfJailCards).toBe(1);

    const withoutCard = removeJailCard(withCard);
    expect(withoutCard.getOutOfJailCards).toBe(0);
  });

  it('should send to jail and release', () => {
    const player = createPlayer('p1', 'Alice', 'red', 1500, 0);
    const jailed = sendToJail(player);
    expect(jailed.inJail).toBe(true);
    expect(jailed.jailTurns).toBe(0);
    expect(jailed.position).toBe(10);

    const released = releaseFromJail(jailed);
    expect(released.inJail).toBe(false);
    expect(released.jailTurns).toBe(0);
  });

  it('should increment jail turns', () => {
    const player = createPlayer('p1', 'Alice', 'red', 1500, 0);
    const jailed = sendToJail(player);
    const turn1 = incrementJailTurn(jailed);
    expect(turn1.jailTurns).toBe(1);
  });

  it('should check affordability', () => {
    const player = createPlayer('p1', 'Alice', 'red', 1500, 0);
    expect(canAfford(player, 1500)).toBe(true);
    expect(canAfford(player, 1501)).toBe(false);
  });

  it('should set bankrupt', () => {
    const player = createPlayer('p1', 'Alice', 'red', 1500, 0);
    const bankrupt = setBankrupt(player);
    expect(bankrupt.bankrupt).toBe(true);
  });
});
