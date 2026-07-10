import { describe, it, expect, beforeEach } from 'vitest';
import { MonopolyEngine } from '../src/engine/engine.js';

describe('MonopolyEngine Integration', () => {
  let engine: MonopolyEngine;

  beforeEach(() => {
    engine = new MonopolyEngine();
  });

  it('should create a game', () => {
    const game = engine.createGame('game-1');
    expect(game.id).toBe('game-1');
    expect(game.players).toEqual([]);
    expect(game.status).toBe('in-progress');
    expect(game.tiles.length).toBe(40);
  });

  it('should add players', () => {
    let game = engine.createGame('game-1');
    game = engine.addPlayer(game, 'p1', 'Alice', 'red', true);
    game = engine.addPlayer(game, 'p2', 'Bob', 'blue');
    expect(game.players.length).toBe(2);
    expect(game.players[0]!.name).toBe('Alice');
    expect(game.players[1]!.name).toBe('Bob');
  });

  it('should start a game with correct initial state', () => {
    let game = engine.createGame('game-1');
    game = engine.addPlayer(game, 'p1', 'Alice', 'red', true);
    game = engine.addPlayer(game, 'p2', 'Bob', 'blue');
    game = engine.startGame(game);

    expect(game.status).toBe('in-progress');
    expect(game.currentTurn).not.toBeNull();
    expect(game.currentTurn!.phase).toBe('waiting-to-roll');
    expect(game.chanceDeck.length).toBe(16);
    expect(game.communityChestDeck.length).toBe(16);
  });

  it('should roll dice and move player', () => {
    let game = engine.createGame('game-1');
    game = engine.addPlayer(game, 'p1', 'Alice', 'red', true);
    game = engine.addPlayer(game, 'p2', 'Bob', 'blue');
    game = engine.startGame(game);

    const result = engine.rollDice(game, 'p1');
    game = result.game;
    const roll = result.roll;

    expect(roll.die1).toBeGreaterThanOrEqual(1);
    expect(roll.die1).toBeLessThanOrEqual(6);
    expect(roll.die2).toBeGreaterThanOrEqual(1);
    expect(roll.die2).toBeLessThanOrEqual(6);
    expect(roll.total).toBe(roll.die1 + roll.die2);
  });

  it('should allow buying a property', () => {
    let game = engine.createGame('game-1');
    game = engine.addPlayer(game, 'p1', 'Alice', 'red', true);
    game = engine.addPlayer(game, 'p2', 'Bob', 'blue');
    game = engine.startGame(game);

    // Manually set Alice to Mediterranean Avenue (tile 1, costs $60)
    // Set phase to resolving-tile so handleTileLanding processes correctly
    game = {
      ...game,
      currentTurn: { ...game.currentTurn!, phase: 'resolving-tile' as const },
      players: game.players.map(p =>
        p.id === 'p1' ? { ...p, position: 1, money: 1500 } : p,
      ),
    };

    // Handle tile landing - should enter deciding-buy phase
    game = engine.handleTileLanding(game, 'p1');
    expect(game.currentTurn!.phase).toBe('deciding-buy');

    // Buy the property
    game = engine.buyProperty(game, 'p1');
    expect(game.currentTurn!.phase).toBe('optional-actions');

    const aliceAfter = game.players.find(p => p.id === 'p1')!;
    expect(aliceAfter.money).toBeLessThan(1500);
    expect(aliceAfter.properties).toContain('property-1');
  });

  it('should handle auction when declining a property', () => {
    let game = engine.createGame('game-1');
    game = engine.addPlayer(game, 'p1', 'Alice', 'red', true);
    game = engine.addPlayer(game, 'p2', 'Bob', 'blue');
    game = engine.startGame(game);

    // Move Alice to Mediterranean Avenue and set resolving-tile phase
    game = {
      ...game,
      currentTurn: { ...game.currentTurn!, phase: 'resolving-tile' as const },
      players: game.players.map(p =>
        p.id === 'p1' ? { ...p, position: 1, money: 1500 } : p,
      ),
    };

    game = engine.handleTileLanding(game, 'p1');

    // Decline - should start auction
    game = engine.declineProperty(game, 'p1');
    expect(game.auction).not.toBeNull();
    expect(game.auction!.active).toBe(true);
    expect(game.auction!.propertyId).toBe('property-1');
  });

  it('should handle paying rent', () => {
    let game = engine.createGame('game-1');
    game = engine.addPlayer(game, 'p1', 'Alice', 'red', true);
    game = engine.addPlayer(game, 'p2', 'Bob', 'blue');
    game = engine.startGame(game);

    // Alice owns Mediterranean Avenue (base rent $2)
    game = {
      ...game,
      tiles: game.tiles.map(t =>
        t.id === 'property-1' ? { ...t, ownerId: 'p1' } : t,
      ),
      players: game.players.map(p =>
        p.id === 'p1' ? { ...p, properties: ['property-1'], money: 1440 } : p,
      ),
    };

    // Bob is on Mediterranean Avenue, with a resolving-tile phase
    const roll = { die1: 1, die2: 1, isDoubles: true, total: 2 };
    game = {
      ...game,
      currentTurn: {
        ...game.currentTurn!,
        playerId: 'p2',
        phase: 'resolving-tile' as const,
        diceRoll: roll,
        doublesCount: 0,
      },
      players: game.players.map(p =>
        p.id === 'p2' ? { ...p, position: 1, money: 1500 } : p,
      ),
    };

    game = engine.handleTileLanding(game, 'p2');
    const bob = game.players.find(p => p.id === 'p2')!;
    const alice = game.players.find(p => p.id === 'p1')!;

    // Bob should have paid base rent of $2
    expect(bob.money).toBe(1498);
    expect(alice.money).toBe(1442);
  });

  it('should handle going to jail from Go To Jail tile', () => {
    let game = engine.createGame('game-1');
    game = engine.addPlayer(game, 'p1', 'Alice', 'red', true);
    game = engine.addPlayer(game, 'p2', 'Bob', 'blue');
    game = engine.startGame(game);

    // Move Alice to Go To Jail (tile 30)
    game = {
      ...game,
      currentTurn: { ...game.currentTurn!, playerId: 'p1' },
      players: game.players.map(p =>
        p.id === 'p1' ? { ...p, position: 30 } : p,
      ),
    };

    game = engine.handleTileLanding(game, 'p1');
    const alice = game.players.find(p => p.id === 'p1')!;
    expect(alice.inJail).toBe(true);
    expect(alice.position).toBe(10);
  });

  it('should handle paying jail fine', () => {
    let game = engine.createGame('game-1');
    game = engine.addPlayer(game, 'p1', 'Alice', 'red', true);
    game = engine.addPlayer(game, 'p2', 'Bob', 'blue');
    game = engine.startGame(game);

    // Put Alice in jail
    game = {
      ...game,
      currentTurn: {
        ...game.currentTurn!,
        playerId: 'p1',
        phase: 'jail-options' as const,
      },
      players: game.players.map(p =>
        p.id === 'p1' ? { ...p, inJail: true, jailTurns: 1, position: 10 } : p,
      ),
    };

    game = engine.payJail(game, 'p1');
    const alice = game.players.find(p => p.id === 'p1')!;
    expect(alice.inJail).toBe(false);
    expect(alice.money).toBe(1450); // 1500 - 50 fine
  });

  it('should build a house on a property', () => {
    let game = engine.createGame('game-1');
    game = engine.addPlayer(game, 'p1', 'Alice', 'red', true);
    game = engine.addPlayer(game, 'p2', 'Bob', 'blue');
    game = engine.startGame(game);

    // Alice owns both brown properties
    game = {
      ...game,
      tiles: game.tiles.map(t => {
        if (t.id === 'property-1' || t.id === 'property-2') {
          return { ...t, ownerId: 'p1' as string | null };
        }
        return t;
      }),
      players: game.players.map(p =>
        p.id === 'p1' ? { ...p, properties: ['property-1', 'property-2'], money: 1380 } : p,
      ),
    };

    game = engine.buildHouse(game, 'p1', 'property-1');
    const prop1 = game.tiles.find(t => t.id === 'property-1') as any;
    expect(prop1.houses).toBe(1);
  });

  it('should handle bankruptcy and declare winner', () => {
    let game = engine.createGame('game-1');
    game = engine.addPlayer(game, 'p1', 'Alice', 'red', true);
    game = engine.addPlayer(game, 'p2', 'Bob', 'blue');
    game = engine.startGame(game);

    // Set Bob as bankrupt
    game = engine.handleBankruptcy(game, 'p2');

    expect(game.winnerId).toBe('p1');
    expect(game.status).toBe('completed');

    const bob = game.players.find(p => p.id === 'p2')!;
    expect(bob.bankrupt).toBe(true);
  });

  it('should handle mortgages', () => {
    let game = engine.createGame('game-1');
    game = engine.addPlayer(game, 'p1', 'Alice', 'red', true);
    game = engine.addPlayer(game, 'p2', 'Bob', 'blue');
    game = engine.startGame(game);

    // Alice owns Mediterranean Avenue
    game = {
      ...game,
      tiles: game.tiles.map(t =>
        t.id === 'property-1' ? { ...t, ownerId: 'p1' as string | null } : t,
      ),
      players: game.players.map(p =>
        p.id === 'p1' ? { ...p, properties: ['property-1'] } : p,
      ),
    };

    const moneyBefore = game.players.find(p => p.id === 'p1')!.money;
    game = engine.mortgage(game, 'p1', 'property-1');
    const alice = game.players.find(p => p.id === 'p1')!;

    expect(alice.money).toBeGreaterThan(moneyBefore);
    const prop1 = game.tiles.find(t => t.id === 'property-1') as any;
    expect(prop1.isMortgaged).toBe(true);
  });

  it('should handle trading', () => {
    let game = engine.createGame('game-1');
    game = engine.addPlayer(game, 'p1', 'Alice', 'red', true);
    game = engine.addPlayer(game, 'p2', 'Bob', 'blue');
    game = engine.startGame(game);

    // Alice owns property-1, Bob owns property-2
    game = {
      ...game,
      tiles: game.tiles.map(t => {
        if (t.id === 'property-1') return { ...t, ownerId: 'p1' as string | null };
        if (t.id === 'property-2') return { ...t, ownerId: 'p2' as string | null };
        return t;
      }),
      players: game.players.map(p => {
        if (p.id === 'p1') return { ...p, properties: ['property-1'] };
        if (p.id === 'p2') return { ...p, properties: ['property-2'] };
        return p;
      }),
    };

    game = engine.createTrade(game, 'p1', 'p2', ['property-1'], 0, ['property-2'], 0);
    expect(game.tradeOffer).not.toBeNull();
    expect(game.tradeOffer!.status).toBe('pending');

    game = engine.acceptTrade(game);
    expect(game.tradeOffer).toBeNull();

    const alice = game.players.find(p => p.id === 'p1')!;
    const bob = game.players.find(p => p.id === 'p2')!;
    expect(alice.properties).toContain('property-2');
    expect(bob.properties).toContain('property-1');
  });

  it('should complete a full turn cycle', () => {
    let game = engine.createGame('game-1');
    game = engine.addPlayer(game, 'p1', 'Alice', 'red', true);
    game = engine.addPlayer(game, 'p2', 'Bob', 'blue');
    game = engine.startGame(game);

    // Roll for Alice
    const result = engine.rollDice(game, 'p1');
    game = result.game;

    // Handle tile landing
    game = engine.handleTileLanding(game, 'p1');

    // End turn - if Alice rolled doubles, she goes again; otherwise Bob goes next
    game = engine.endTurn(game, 'p1');
    const isDoubles = result.roll.isDoubles;
    if (isDoubles) {
      // Alice rolled doubles - she should go again (same player)
      expect(game.currentTurn!.playerId).toBe('p1');
      expect(game.turnIndex).toBe(0);
    } else {
      expect(game.currentTurn!.playerId).toBe('p2');
      expect(game.turnIndex).toBe(1);
    }
  });
});
