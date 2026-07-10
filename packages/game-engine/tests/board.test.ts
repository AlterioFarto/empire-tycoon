import { describe, it, expect } from 'vitest';
import { StandardBoard } from '../src/board/board.js';

describe('Board', () => {
  const board = new StandardBoard();

  it('should have 40 tiles', () => {
    expect(board.getSize()).toBe(40);
    expect(board.getTiles().length).toBe(40);
  });

  it('should have correct tile at GO', () => {
    const go = board.getTile(0);
    expect(go.type).toBe('go');
    expect(go.name).toBe('GO');
  });

  it('should have correct tile at Jail', () => {
    const jail = board.getTile(10);
    expect(jail.type).toBe('jail');
    expect(jail.name).toBe('Jail / Just Visiting');
  });

  it('should calculate movement correctly without passing GO', () => {
    const result = board.calculateMovement(5, 3);
    expect(result.newPosition).toBe(8);
    expect(result.passedGo).toBe(false);
  });

  it('should calculate movement correctly when passing GO', () => {
    const result = board.calculateMovement(38, 5);
    expect(result.newPosition).toBe(3);
    expect(result.passedGo).toBe(true);
  });

  it('should calculate movement exactly at GO boundary', () => {
    const result = board.calculateMovement(39, 1);
    expect(result.newPosition).toBe(0);
    expect(result.passedGo).toBe(true);
  });

  it('should get property by id', () => {
    const prop = board.getProperty('property-1');
    expect(prop).toBeDefined();
    expect(prop!.name).toBe('Mediterranean Avenue');
    expect(prop!.color).toBe('brown');
    expect(prop!.price).toBe(60);
  });

  it('should get railroad by id', () => {
    const rr = board.getRailroad('railroad-1');
    expect(rr).toBeDefined();
    expect(rr!.name).toBe('Reading Railroad');
    expect(rr!.price).toBe(200);
  });

  it('should get utility by id', () => {
    const util = board.getUtility('utility-1');
    expect(util).toBeDefined();
    expect(util!.name).toBe('Electric Company');
    expect(util!.price).toBe(150);
  });

  it('should calculate distance to nearest railroad', () => {
    const board2 = new StandardBoard();
    // Position 7: nearest railroad is at 5 (Reading), or 15 (Pennsylvania). 5 is closer.
    const dist1 = board2.getDistanceToNearestRailroad(7);
    expect(dist1).toBe(8); // 15 - 7 = 8, but 5 is behind... wait, let me calculate
    // From 7: 5 is behind (distance 38 going forward), 15 is 8 forward
    // So nearest is 15 with distance 8
    expect(dist1).toBe(8);

    // Position 3: nearest railroad is at 5 with distance 2
    const dist2 = board2.getDistanceToNearestRailroad(3);
    expect(dist2).toBe(2);
  });

  it('should calculate distance to nearest utility', () => {
    const board2 = new StandardBoard();
    // Position 7: nearest utility is at 12 with distance 5
    const dist = board2.getDistanceToNearestUtility(7);
    expect(dist).toBe(5);
  });
});
