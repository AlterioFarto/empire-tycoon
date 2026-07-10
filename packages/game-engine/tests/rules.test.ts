import { describe, it, expect } from 'vitest';
import {
  canBuyProperty, canBuildOnProperty, canMortgage, canUnmortgage,
  canTradeProperty, hasPlayerWon,
} from '../src/rules/rules.js';
import type { PropertyTile, Player, Tile, GameSettings, GameState } from '@monopoly/shared';

const settings: GameSettings = {
  startingCash: 1500,
  maxPlayers: 8,
  freeParkingJackpot: false,
  doubleMoneyOnGo: false,
  noAuctions: false,
  auctionType: 'standard',
  houseLimit: 32,
  hotelLimit: 12,
  turnTimeout: 60000,
  allowSpectators: true,
};

describe('Rules', () => {
  describe('canBuyProperty', () => {
    it('should allow buying unowned property with sufficient funds', () => {
      const player = { id: 'p1', money: 1500 } as Player;
      const tile = { type: 'property', ownerId: null, price: 200 } as unknown as Tile;
      const result = canBuyProperty(player, tile, settings);
      expect(result.allowed).toBe(true);
    });

    it('should reject buying owned property', () => {
      const player = { id: 'p1', money: 1500 } as Player;
      const tile = { type: 'property', ownerId: 'p2', price: 200 } as unknown as Tile;
      const result = canBuyProperty(player, tile, settings);
      expect(result.allowed).toBe(false);
    });

    it('should reject buying with insufficient funds', () => {
      const player = { id: 'p1', money: 50 } as Player;
      const tile = { type: 'property', ownerId: null, price: 200 } as unknown as Tile;
      const result = canBuyProperty(player, tile, settings);
      expect(result.allowed).toBe(false);
    });
  });

  describe('canBuildOnProperty', () => {
    const baseProperty: PropertyTile = {
      id: 'prop-1', tileIndex: 1, name: 'Test', type: 'property',
      color: 'brown', price: 60, rent: 2, rentWithOneHouse: 10,
      rentWithTwoHouses: 30, rentWithThreeHouses: 90, rentWithFourHouses: 160,
      rentWithHotel: 250, houseCost: 50, mortgageValue: 30,
      ownerId: 'p1', houses: 0, isHotel: false, isMortgaged: false,
      colorGroupCount: 2,
    };

    it('should allow building with full group and even building', () => {
      const ownedGroup = [
        { ...baseProperty, id: 'prop-1', houses: 0 },
        { ...baseProperty, id: 'prop-2', ownerId: 'p1' as string | null, houses: 0 },
      ];
      const result = canBuildOnProperty(baseProperty, { id: 'p1' } as Player, ownedGroup, 10, 10);
      expect(result.allowed).toBe(true);
    });

    it('should reject building on unowned property', () => {
      const unowned = { ...baseProperty, ownerId: 'p2' };
      const result = canBuildOnProperty(unowned, { id: 'p1' } as Player, [], 10, 10);
      expect(result.allowed).toBe(false);
    });

    it('should reject building on mortgaged property', () => {
      const mortgaged = { ...baseProperty, isMortgaged: true };
      const result = canBuildOnProperty(mortgaged, { id: 'p1' } as Player, [], 10, 10);
      expect(result.allowed).toBe(false);
    });
  });

  describe('canMortgage', () => {
    it('should allow mortgaging unencumbered property', () => {
      const prop = { type: 'property', isMortgaged: false, houses: 0, isHotel: false, ownerId: 'p1' } as PropertyTile;
      const result = canMortgage(prop, []);
      expect(result.allowed).toBe(true);
    });

    it('should reject mortgaging already mortgaged property', () => {
      const prop = { type: 'property', isMortgaged: true, houses: 0 } as PropertyTile;
      const result = canMortgage(prop, []);
      expect(result.allowed).toBe(false);
    });
  });

  describe('hasPlayerWon', () => {
    it('should declare winner when only one active player', () => {
      const game = {
        players: [
          { id: 'p1', bankrupt: false },
          { id: 'p2', bankrupt: true },
          { id: 'p3', bankrupt: true },
        ],
      } as unknown as GameState;
      expect(hasPlayerWon(game)).toBe('p1');
    });

    it('should return null when multiple active players', () => {
      const game = {
        players: [
          { id: 'p1', bankrupt: false },
          { id: 'p2', bankrupt: false },
        ],
      } as unknown as GameState;
      expect(hasPlayerWon(game)).toBeNull();
    });
  });
});
