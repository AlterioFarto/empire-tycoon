import { describe, it, expect } from 'vitest';
import { calculatePropertyRent, calculateRailroadRent, calculateUtilityRent } from '../src/rent/rent.js';
import { createDiceRoll } from '../src/dice/dice.js';
import type { PropertyTile, RailroadTile, UtilityTile } from '@monopoly/shared';

const baseProperty: PropertyTile = {
  id: 'test-prop',
  tileIndex: 1,
  name: 'Test Avenue',
  type: 'property',
  color: 'brown',
  price: 60,
  rent: 2,
  rentWithOneHouse: 10,
  rentWithTwoHouses: 30,
  rentWithThreeHouses: 90,
  rentWithFourHouses: 160,
  rentWithHotel: 250,
  houseCost: 50,
  mortgageValue: 30,
  ownerId: null,
  houses: 0,
  isHotel: false,
  isMortgaged: false,
  colorGroupCount: 2,
};

const baseRailroad: RailroadTile = {
  id: 'test-rr',
  tileIndex: 5,
  name: 'Test Railroad',
  type: 'railroad',
  price: 200,
  rent: [25, 50, 100, 200],
  mortgageValue: 100,
  ownerId: null,
  isMortgaged: false,
};

const baseUtility: UtilityTile = {
  id: 'test-util',
  tileIndex: 12,
  name: 'Test Utility',
  type: 'utility',
  price: 150,
  mortgageValue: 75,
  ownerId: null,
  isMortgaged: false,
};

describe('Rent Calculation', () => {
  describe('Property Rent', () => {
    it('should return base rent when no houses and not full group', () => {
      expect(calculatePropertyRent(baseProperty, 0)).toBe(2);
      expect(calculatePropertyRent(baseProperty, 1)).toBe(2);
    });

    it('should double rent when owning full group with no houses', () => {
      const ownedProperty = { ...baseProperty, ownerId: 'p1' };
      expect(calculatePropertyRent(ownedProperty, 2)).toBe(4);
    });

    it('should return correct rent with houses', () => {
      const oneHouse = { ...baseProperty, houses: 1 };
      expect(calculatePropertyRent(oneHouse, 2)).toBe(10);

      const twoHouses = { ...baseProperty, houses: 2 };
      expect(calculatePropertyRent(twoHouses, 2)).toBe(30);

      const threeHouses = { ...baseProperty, houses: 3 };
      expect(calculatePropertyRent(threeHouses, 2)).toBe(90);

      const fourHouses = { ...baseProperty, houses: 4 };
      expect(calculatePropertyRent(fourHouses, 2)).toBe(160);
    });

    it('should return hotel rent', () => {
      const hotel = { ...baseProperty, isHotel: true };
      expect(calculatePropertyRent(hotel, 2)).toBe(250);
    });

    it('should return 0 rent when mortgaged', () => {
      const mortgaged = { ...baseProperty, isMortgaged: true };
      expect(calculatePropertyRent(mortgaged, 0)).toBe(0);
    });
  });

  describe('Railroad Rent', () => {
    it('should return $25 for 1 railroad', () => {
      expect(calculateRailroadRent(baseRailroad, 1)).toBe(25);
    });

    it('should return $50 for 2 railroads', () => {
      expect(calculateRailroadRent(baseRailroad, 2)).toBe(50);
    });

    it('should return $100 for 3 railroads', () => {
      expect(calculateRailroadRent(baseRailroad, 3)).toBe(100);
    });

    it('should return $200 for 4 railroads', () => {
      expect(calculateRailroadRent(baseRailroad, 4)).toBe(200);
    });

    it('should return 0 when mortgaged', () => {
      const mortgaged = { ...baseRailroad, isMortgaged: true };
      expect(calculateRailroadRent(mortgaged, 2)).toBe(0);
    });
  });

  describe('Utility Rent', () => {
    it('should return 4x dice roll for 1 utility', () => {
      const roll = createDiceRoll(3, 4);
      expect(calculateUtilityRent(baseUtility, 1, roll)).toBe(28); // 7 * 4
    });

    it('should return 10x dice roll for 2 utilities', () => {
      const roll = createDiceRoll(3, 4);
      expect(calculateUtilityRent(baseUtility, 2, roll)).toBe(70); // 7 * 10
    });

    it('should return 0 when mortgaged', () => {
      const roll = createDiceRoll(3, 4);
      const mortgaged = { ...baseUtility, isMortgaged: true };
      expect(calculateUtilityRent(mortgaged, 2, roll)).toBe(0);
    });
  });
});
