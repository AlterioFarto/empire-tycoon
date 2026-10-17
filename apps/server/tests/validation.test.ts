import { describe, it, expect } from 'vitest';
import {
  isValidPlayerName,
  isValidPlayerColor,
  isValidLobbyCode,
  isValidAmount,
  isValidPropertyId,
  propertyExists,
  validateSettings,
  validateTradeOffer,
  validateChatMessage,
  isUuid,
} from '../src/validation/validators.js';
import { MonopolyEngine } from '@monopoly/game-engine';

describe('socket boundary validation', () => {
  it('lobby:join name length/color', () => {
    expect(isValidPlayerName('')).toBe(false);
    expect(isValidPlayerName('   ')).toBe(false);
    expect(isValidPlayerName('a'.repeat(17))).toBe(false);
    expect(isValidPlayerName('Alice')).toBe(true);
    expect(isValidPlayerName('  Bob  ')).toBe(true); // trimmed ok

    expect(isValidPlayerColor('red')).toBe(true);
    expect(isValidPlayerColor('invalid')).toBe(false);
    expect(isValidPlayerColor('RED')).toBe(false); // case sensitive

    expect(isValidLobbyCode('ABCDEF')).toBe(true);
    expect(isValidLobbyCode('abc123')).toBe(false); // contains I/O? but regex allows but case upper, still need 6
    expect(isValidLobbyCode('AB12')).toBe(false);
    expect(isValidLobbyCode('ABCDEFG')).toBe(false);
    expect(isValidLobbyCode('')).toBe(false);
  });

  it('lobby:update-settings rejects bad values', () => {
    expect(validateSettings({ startingCash: 100 }).valid).toBe(false);
    expect(validateSettings({ startingCash: 1500 }).valid).toBe(true);
    expect(validateSettings({ maxPlayers: 1 }).valid).toBe(false);
    expect(validateSettings({ maxPlayers: 9 }).valid).toBe(false);
    expect(validateSettings({ maxPlayers: 4 }).valid).toBe(true);
    expect(validateSettings({ auctionType: 'bad' }).valid).toBe(false);
    expect(validateSettings({ auctionType: 'standard' }).valid).toBe(true);
    expect(validateSettings({ unknownKey: 123 } as never).valid).toBe(false);
    expect(validateSettings(null as unknown as Record<string, unknown>).valid).toBe(false);
    expect(validateSettings({ turnTimeout: 5000 }).valid).toBe(false);
    expect(validateSettings({}).valid).toBe(true);
  });

  it('game:auction-bid amount >0 integer', () => {
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-5)).toBe(false);
    expect(isValidAmount(1.5)).toBe(false);
    expect(isValidAmount(NaN)).toBe(false);
    expect(isValidAmount(Infinity)).toBe(false);
    expect(isValidAmount('10' as unknown as number)).toBe(false);
    expect(isValidAmount(10)).toBe(true);
    expect(isValidAmount(1000000)).toBe(true);
  });

  it('propertyId must exist on board', () => {
    const engine = new MonopolyEngine();
    let game = engine.createGame('val-board', { startingCash: 1500 } as never);
    game = engine.addPlayer(game, crypto.randomUUID(), 'Alice', 'red', true);
    // any random id fails existence
    expect(isValidPropertyId('')).toBe(false);
    expect(isValidPropertyId('not-a-property')).toBe(true); // format ok
    expect(propertyExists(game, 'not-a-property')).toBe(false);
    // real tile id exists
    const realId = game.tiles[1]!.id; // property
    expect(propertyExists(game, realId)).toBe(true);
  });

  it('game:trade-offer validation', () => {
    const engine = new MonopolyEngine();
    let game = engine.createGame('val-trade', { startingCash: 1500 } as never);
    const stableA = crypto.randomUUID();
    const stableB = crypto.randomUUID();
    game = engine.addPlayer(game, stableA, 'Alice', 'red', true);
    game = engine.addPlayer(game, stableB, 'Bob', 'blue', false);
    game = engine.startGame(game);
    const realProp = game.tiles.find(t => t.type === 'property')!.id;

    expect(validateTradeOffer({ toPlayerId: stableB, offerProperties: [realProp], offerMoney: 100, requestProperties: [], requestMoney: 0 }, game).valid).toBe(true);
    expect(validateTradeOffer({ toPlayerId: 'bad-uuid', offerProperties: [], offerMoney: 0, requestProperties: [], requestMoney: 0 }, game).valid).toBe(false);
    expect(validateTradeOffer({ toPlayerId: stableB, offerProperties: ['fake-id'], offerMoney: 0, requestProperties: [], requestMoney: 0 }, game).valid).toBe(false);
    expect(validateTradeOffer({ toPlayerId: stableB, offerProperties: [], offerMoney: -10, requestProperties: [], requestMoney: 0 }, game).valid).toBe(false);
    expect(validateTradeOffer({ toPlayerId: stableB, offerProperties: [realProp], offerMoney: 0, requestProperties: [realProp], requestMoney: 0 }, game).valid).toBe(false); // duplicate
    expect(validateTradeOffer(null, game).valid).toBe(false);
    expect(validateTradeOffer({ toPlayerId: stableA, offerProperties: [], offerMoney: 0, requestProperties: [], requestMoney: 0 }, { ...game, players: [] }).valid).toBe(false); // toPlayer not in game
  });

  it('chat message 1-500 chars', () => {
    expect(validateChatMessage({ message: '' }).valid).toBe(false);
    expect(validateChatMessage({ message: '   ' }).valid).toBe(false);
    expect(validateChatMessage({ message: 'hello' }).valid).toBe(true);
    expect(validateChatMessage({ message: 'a'.repeat(501) }).valid).toBe(false);
    expect(validateChatMessage(null).valid).toBe(false);
  });

  it('uuid validation', () => {
    expect(isUuid(crypto.randomUUID())).toBe(true);
    expect(isUuid('not-uuid')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid(123 as unknown as string)).toBe(false);
  });

  it('malformed payloads do not crash validators (return invalid)', () => {
    // previously `data.settings as any` would throw on null
    expect(validateSettings(undefined).valid).toBe(true);
    expect(validateSettings('string' as unknown as Record<string, unknown>).valid).toBe(false);
    expect(validateTradeOffer(undefined as unknown as Record<string, unknown>, { tiles: [], players: [] } as unknown as never).valid).toBe(false);
    expect(() => isValidPropertyId(null as unknown as string)).not.toThrow();
    expect(() => propertyExists({ tiles: [] } as unknown as never, 'x')).not.toThrow();
  });
});
