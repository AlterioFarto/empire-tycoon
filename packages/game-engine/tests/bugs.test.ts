import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MonopolyEngine } from '../src/engine/engine.js';
import type { MonopolyCard } from '@monopoly/shared';

// Helper: force the next dice roll by mocking Math.random.
// RandomDice.roll() calls Math.random() twice (die1, die2).
function mockRoll(die1: number, die2: number) {
  const toRand = (d: number) => (d - 1) / 6 + 0.01; // maps die value -> a Math.random() return
  return vi
    .spyOn(Math, 'random')
    .mockReturnValueOnce(toRand(die1))
    .mockReturnValueOnce(toRand(die2));
}

describe('Bug 1 — Passing GO updates position, phase, and pays salary exactly once', () => {
  let engine: MonopolyEngine;
  beforeEach(() => { engine = new MonopolyEngine(); });
  afterEach(() => vi.restoreAllMocks());

  it('moves the player past GO and awards salary', () => {
    let game = engine.createGame('g1');
    game = engine.addPlayer(game, 'p1', 'Alice', 'red', true);
    game = engine.addPlayer(game, 'p2', 'Bob', 'blue');
    game = engine.startGame(game);

    // Put Alice just before GO so a normal roll wraps the board.
    game = {
      ...game,
      players: game.players.map(p => (p.id === 'p1' ? { ...p, position: 38, money: 1500 } : p)),
    };

    // Force roll (3, 4) -> total 7 -> (38 + 7) % 40 = 5 (wraps past GO).
    mockRoll(3, 4);
    const result = engine.rollDice(game, 'p1');
    game = result.game;

    const alice = game.players.find(p => p.id === 'p1')!;
    expect(alice.position).toBe(5); // NOT stuck on tile before GO (38)
    expect(alice.money).toBe(1700); // 1500 + 200 GO salary
    expect(game.currentTurn!.phase).toBe('moving');

    const collectLog = game.logs.find(l => l.type === 'collect');
    const rollLog = game.logs.find(l => l.type === 'roll');
    expect(collectLog).toBeDefined();
    expect(rollLog).toBeDefined();
  });
});

describe('Bug 2 — Jail roll: one attempt per turn, tile resolved on release', () => {
  let engine: MonopolyEngine;
  beforeEach(() => { engine = new MonopolyEngine(); });
  afterEach(() => vi.restoreAllMocks());

  function jailedGame(jailTurns: number) {
    let game = engine.createGame('g2');
    game = engine.addPlayer(game, 'p1', 'Alice', 'red', true);
    game = engine.addPlayer(game, 'p2', 'Bob', 'blue');
    game = engine.startGame(game);
    game = {
      ...game,
      currentTurn: { ...game.currentTurn!, phase: 'jail-options' as const },
      players: game.players.map(p =>
        p.id === 'p1' ? { ...p, inJail: true, jailTurns, position: 10 } : p,
      ),
    };
    return game;
  }

  it('failed roll ends the turn (no re-roll in same turn)', () => {
    let game = jailedGame(0);
    mockRoll(2, 3); // not doubles
    const { game: after } = engine.rollForJail(game, 'p1');
    expect(after.currentTurn!.playerId).toBe('p2'); // turn passed on
    const alice = after.players.find(p => p.id === 'p1')!;
    expect(alice.jailTurns).toBe(1);
  });

  it('doubles releases the player, moves them, and resolves the tile (no extra roll)', () => {
    let game = jailedGame(1);
    mockRoll(3, 3); // doubles -> release
    const { game: after } = engine.rollForJail(game, 'p1');
    const alice = after.players.find(p => p.id === 'p1')!;

    expect(alice.inJail).toBe(false);
    expect(alice.position).toBe(16); // (10 + 6) % 40
    expect(after.currentTurn!.phase).not.toBe('jail-options');

    // Calling rollForJail again must be a no-op (guard prevents re-roll).
    const again = engine.rollForJail(after, 'p1').game;
    expect(again.players.find(p => p.id === 'p1')!.position).toBe(16);
  });
});

describe('Bug 3 — Card movement triggers destination tile actions', () => {
  let engine: MonopolyEngine;
  beforeEach(() => { engine = new MonopolyEngine(); });

  function onChanceTile(card: MonopolyCard) {
    let game = engine.createGame('g3');
    game = engine.addPlayer(game, 'p1', 'Alice', 'red', true);
    game = engine.addPlayer(game, 'p2', 'Bob', 'blue');
    game = engine.startGame(game);
    // Place a known card on top of the chance deck and put Alice on a Chance tile (index 7).
    game = {
      ...game,
      chanceDeck: [card, ...game.chanceDeck.slice(1)],
      currentTurn: { ...game.currentTurn!, phase: 'resolving-tile' as const },
      players: game.players.map(p => (p.id === 'p1' ? { ...p, position: 7, money: 1500 } : p)),
    };
    return game;
  }

  it('Advance to GO moves the player to GO and pays $200', () => {
    const card: MonopolyCard = { id: 'c1', type: 'chance', title: 'Advance to Go', description: '', action: 'advance-to-go' };
    let game = onChanceTile(card);
    game = engine.handleTileLanding(game, 'p1');
    const alice = game.players.find(p => p.id === 'p1')!;
    expect(alice.position).toBe(0);
    expect(alice.money).toBe(1700); // 1500 + 200 from card
  });

  it('Advance to an unowned property offers the buy option', () => {
    const card: MonopolyCard = { id: 'c2', type: 'chance', title: 'Advance', description: '', action: 'advance-to-tile', targetTileId: 1 };
    let game = onChanceTile(card);
    game = engine.handleTileLanding(game, 'p1');
    const alice = game.players.find(p => p.id === 'p1')!;
    expect(alice.position).toBe(1); // Mediterranean Avenue
    expect(game.currentTurn!.phase).toBe('deciding-buy'); // tile action processed
  });

  it('Go Back 3 Spaces lands on a tax tile and charges tax', () => {
    const card: MonopolyCard = { id: 'c3', type: 'chance', title: 'Go Back 3', description: '', action: 'go-back-3' };
    let game = onChanceTile(card);
    game = engine.handleTileLanding(game, 'p1');
    const alice = game.players.find(p => p.id === 'p1')!;
    expect(alice.position).toBe(4); // Income Tax
    expect(alice.money).toBeLessThan(1500); // tax paid
  });
});

describe('Related — card deck recycling (no depletion / crash)', () => {
  let engine: MonopolyEngine;
  beforeEach(() => { engine = new MonopolyEngine(); });

  it('drawing far more cards than the deck size never crashes and conserves cards', () => {
    let game = engine.createGame('g4');
    game = engine.addPlayer(game, 'p1', 'Alice', 'red', true);
    game = engine.addPlayer(game, 'p2', 'Bob', 'blue');
    game = engine.startGame(game);

    expect(() => {
      for (let i = 0; i < 40; i++) {
        game = engine.drawCard(game, 'p1').game;
        const total = game.chanceDeck.length + game.chanceDiscard.length;
        expect(total).toBe(16); // conservation across recycling
      }
    }).not.toThrow();
  });
});
