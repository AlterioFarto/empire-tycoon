import type { Tile, PropertyTile, RailroadTile, UtilityTile, GoTile, JailTile, GoToJailTile, FreeParkingTile, TaxTile, ChanceTile, CommunityChestTile } from './types.js';

export interface BoardLayout {
  tiles: Tile[];
  propertySets: Record<string, string[]>;
}

const STANDARD_BOARD_TILES: Tile[] = [
  // 0: GO
  { id: 'go', tileIndex: 0, name: 'GO', type: 'go' } satisfies GoTile,

  // 1: Mediterranean Avenue
  { id: 'property-1', tileIndex: 1, name: 'Mediterranean Avenue', type: 'property', color: 'brown', price: 60, rent: 2, rentWithOneHouse: 10, rentWithTwoHouses: 30, rentWithThreeHouses: 90, rentWithFourHouses: 160, rentWithHotel: 250, houseCost: 50, mortgageValue: 30, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 2 } satisfies PropertyTile,

  // 2: Community Chest
  { id: 'community-chest-1', tileIndex: 2, name: 'Community Chest', type: 'community-chest' } satisfies CommunityChestTile,

  // 3: Baltic Avenue
  { id: 'property-2', tileIndex: 3, name: 'Baltic Avenue', type: 'property', color: 'brown', price: 60, rent: 4, rentWithOneHouse: 20, rentWithTwoHouses: 60, rentWithThreeHouses: 180, rentWithFourHouses: 320, rentWithHotel: 450, houseCost: 50, mortgageValue: 30, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 2 } satisfies PropertyTile,

  // 4: Income Tax
  { id: 'tax-1', tileIndex: 4, name: 'Income Tax', type: 'tax', amount: 200, percentage: 10 } satisfies TaxTile,

  // 5: Reading Railroad
  { id: 'railroad-1', tileIndex: 5, name: 'Reading Railroad', type: 'railroad', price: 200, rent: [25, 50, 100, 200], mortgageValue: 100, ownerId: null, isMortgaged: false } satisfies RailroadTile,

  // 6: Oriental Avenue
  { id: 'property-3', tileIndex: 6, name: 'Oriental Avenue', type: 'property', color: 'light-blue', price: 100, rent: 6, rentWithOneHouse: 30, rentWithTwoHouses: 90, rentWithThreeHouses: 270, rentWithFourHouses: 400, rentWithHotel: 550, houseCost: 50, mortgageValue: 50, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 3 } satisfies PropertyTile,

  // 7: Chance
  { id: 'chance-1', tileIndex: 7, name: 'Chance', type: 'chance' } satisfies ChanceTile,

  // 8: Vermont Avenue
  { id: 'property-4', tileIndex: 8, name: 'Vermont Avenue', type: 'property', color: 'light-blue', price: 100, rent: 6, rentWithOneHouse: 30, rentWithTwoHouses: 90, rentWithThreeHouses: 270, rentWithFourHouses: 400, rentWithHotel: 550, houseCost: 50, mortgageValue: 50, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 3 } satisfies PropertyTile,

  // 9: Connecticut Avenue
  { id: 'property-5', tileIndex: 9, name: 'Connecticut Avenue', type: 'property', color: 'light-blue', price: 120, rent: 8, rentWithOneHouse: 40, rentWithTwoHouses: 100, rentWithThreeHouses: 300, rentWithFourHouses: 450, rentWithHotel: 600, houseCost: 50, mortgageValue: 60, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 3 } satisfies PropertyTile,

  // 10: Jail
  { id: 'jail', tileIndex: 10, name: 'Jail / Just Visiting', type: 'jail' } satisfies JailTile,

  // 11: St. Charles Place
  { id: 'property-6', tileIndex: 11, name: 'St. Charles Place', type: 'property', color: 'pink', price: 140, rent: 10, rentWithOneHouse: 50, rentWithTwoHouses: 150, rentWithThreeHouses: 450, rentWithFourHouses: 625, rentWithHotel: 750, houseCost: 100, mortgageValue: 70, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 3 } satisfies PropertyTile,

  // 12: Electric Company
  { id: 'utility-1', tileIndex: 12, name: 'Electric Company', type: 'utility', price: 150, mortgageValue: 75, ownerId: null, isMortgaged: false } satisfies UtilityTile,

  // 13: States Avenue
  { id: 'property-7', tileIndex: 13, name: 'States Avenue', type: 'property', color: 'pink', price: 140, rent: 10, rentWithOneHouse: 50, rentWithTwoHouses: 150, rentWithThreeHouses: 450, rentWithFourHouses: 625, rentWithHotel: 750, houseCost: 100, mortgageValue: 70, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 3 } satisfies PropertyTile,

  // 14: Virginia Avenue
  { id: 'property-8', tileIndex: 14, name: 'Virginia Avenue', type: 'property', color: 'pink', price: 160, rent: 12, rentWithOneHouse: 60, rentWithTwoHouses: 180, rentWithThreeHouses: 500, rentWithFourHouses: 700, rentWithHotel: 900, houseCost: 100, mortgageValue: 80, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 3 } satisfies PropertyTile,

  // 15: Pennsylvania Railroad
  { id: 'railroad-2', tileIndex: 15, name: 'Pennsylvania Railroad', type: 'railroad', price: 200, rent: [25, 50, 100, 200], mortgageValue: 100, ownerId: null, isMortgaged: false } satisfies RailroadTile,

  // 16: St. James Place
  { id: 'property-9', tileIndex: 16, name: 'St. James Place', type: 'property', color: 'orange', price: 180, rent: 14, rentWithOneHouse: 70, rentWithTwoHouses: 200, rentWithThreeHouses: 550, rentWithFourHouses: 750, rentWithHotel: 950, houseCost: 100, mortgageValue: 90, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 3 } satisfies PropertyTile,

  // 17: Community Chest
  { id: 'community-chest-2', tileIndex: 17, name: 'Community Chest', type: 'community-chest' } satisfies CommunityChestTile,

  // 18: Tennessee Avenue
  { id: 'property-10', tileIndex: 18, name: 'Tennessee Avenue', type: 'property', color: 'orange', price: 180, rent: 14, rentWithOneHouse: 70, rentWithTwoHouses: 200, rentWithThreeHouses: 550, rentWithFourHouses: 750, rentWithHotel: 950, houseCost: 100, mortgageValue: 90, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 3 } satisfies PropertyTile,

  // 19: New York Avenue
  { id: 'property-11', tileIndex: 19, name: 'New York Avenue', type: 'property', color: 'orange', price: 200, rent: 16, rentWithOneHouse: 80, rentWithTwoHouses: 220, rentWithThreeHouses: 600, rentWithFourHouses: 800, rentWithHotel: 1000, houseCost: 100, mortgageValue: 100, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 3 } satisfies PropertyTile,

  // 20: Free Parking
  { id: 'free-parking', tileIndex: 20, name: 'Free Parking', type: 'free-parking' } satisfies FreeParkingTile,

  // 21: Kentucky Avenue
  { id: 'property-12', tileIndex: 21, name: 'Kentucky Avenue', type: 'property', color: 'red', price: 220, rent: 18, rentWithOneHouse: 90, rentWithTwoHouses: 250, rentWithThreeHouses: 700, rentWithFourHouses: 875, rentWithHotel: 1050, houseCost: 150, mortgageValue: 110, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 3 } satisfies PropertyTile,

  // 22: Chance
  { id: 'chance-2', tileIndex: 22, name: 'Chance', type: 'chance' } satisfies ChanceTile,

  // 23: Indiana Avenue
  { id: 'property-13', tileIndex: 23, name: 'Indiana Avenue', type: 'property', color: 'red', price: 220, rent: 18, rentWithOneHouse: 90, rentWithTwoHouses: 250, rentWithThreeHouses: 700, rentWithFourHouses: 875, rentWithHotel: 1050, houseCost: 150, mortgageValue: 110, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 3 } satisfies PropertyTile,

  // 24: Illinois Avenue
  { id: 'property-14', tileIndex: 24, name: 'Illinois Avenue', type: 'property', color: 'red', price: 240, rent: 20, rentWithOneHouse: 100, rentWithTwoHouses: 300, rentWithThreeHouses: 750, rentWithFourHouses: 925, rentWithHotel: 1100, houseCost: 150, mortgageValue: 120, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 3 } satisfies PropertyTile,

  // 25: B&O Railroad
  { id: 'railroad-3', tileIndex: 25, name: 'B&O Railroad', type: 'railroad', price: 200, rent: [25, 50, 100, 200], mortgageValue: 100, ownerId: null, isMortgaged: false } satisfies RailroadTile,

  // 26: Atlantic Avenue
  { id: 'property-15', tileIndex: 26, name: 'Atlantic Avenue', type: 'property', color: 'yellow', price: 260, rent: 22, rentWithOneHouse: 110, rentWithTwoHouses: 330, rentWithThreeHouses: 800, rentWithFourHouses: 975, rentWithHotel: 1150, houseCost: 150, mortgageValue: 130, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 3 } satisfies PropertyTile,

  // 27: Ventnor Avenue
  { id: 'property-16', tileIndex: 27, name: 'Ventnor Avenue', type: 'property', color: 'yellow', price: 260, rent: 22, rentWithOneHouse: 110, rentWithTwoHouses: 330, rentWithThreeHouses: 800, rentWithFourHouses: 975, rentWithHotel: 1150, houseCost: 150, mortgageValue: 130, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 3 } satisfies PropertyTile,

  // 28: Water Works
  { id: 'utility-2', tileIndex: 28, name: 'Water Works', type: 'utility', price: 150, mortgageValue: 75, ownerId: null, isMortgaged: false } satisfies UtilityTile,

  // 29: Marvin Gardens
  { id: 'property-17', tileIndex: 29, name: 'Marvin Gardens', type: 'property', color: 'yellow', price: 280, rent: 24, rentWithOneHouse: 120, rentWithTwoHouses: 360, rentWithThreeHouses: 850, rentWithFourHouses: 1025, rentWithHotel: 1200, houseCost: 150, mortgageValue: 140, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 3 } satisfies PropertyTile,

  // 30: Go To Jail
  { id: 'go-to-jail', tileIndex: 30, name: 'Go To Jail', type: 'go-to-jail' } satisfies GoToJailTile,

  // 31: Pacific Avenue
  { id: 'property-18', tileIndex: 31, name: 'Pacific Avenue', type: 'property', color: 'green', price: 300, rent: 26, rentWithOneHouse: 130, rentWithTwoHouses: 390, rentWithThreeHouses: 900, rentWithFourHouses: 1100, rentWithHotel: 1275, houseCost: 200, mortgageValue: 150, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 3 } satisfies PropertyTile,

  // 32: North Carolina Avenue
  { id: 'property-19', tileIndex: 32, name: 'North Carolina Avenue', type: 'property', color: 'green', price: 300, rent: 26, rentWithOneHouse: 130, rentWithTwoHouses: 390, rentWithThreeHouses: 900, rentWithFourHouses: 1100, rentWithHotel: 1275, houseCost: 200, mortgageValue: 150, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 3 } satisfies PropertyTile,

  // 33: Community Chest
  { id: 'community-chest-3', tileIndex: 33, name: 'Community Chest', type: 'community-chest' } satisfies CommunityChestTile,

  // 34: Pennsylvania Avenue
  { id: 'property-20', tileIndex: 34, name: 'Pennsylvania Avenue', type: 'property', color: 'green', price: 320, rent: 28, rentWithOneHouse: 150, rentWithTwoHouses: 450, rentWithThreeHouses: 1000, rentWithFourHouses: 1200, rentWithHotel: 1400, houseCost: 200, mortgageValue: 160, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 3 } satisfies PropertyTile,

  // 35: Short Line Railroad
  { id: 'railroad-4', tileIndex: 35, name: 'Short Line Railroad', type: 'railroad', price: 200, rent: [25, 50, 100, 200], mortgageValue: 100, ownerId: null, isMortgaged: false } satisfies RailroadTile,

  // 36: Chance
  { id: 'chance-3', tileIndex: 36, name: 'Chance', type: 'chance' } satisfies ChanceTile,

  // 37: Park Place
  { id: 'property-21', tileIndex: 37, name: 'Park Place', type: 'property', color: 'dark-blue', price: 350, rent: 35, rentWithOneHouse: 175, rentWithTwoHouses: 500, rentWithThreeHouses: 1100, rentWithFourHouses: 1300, rentWithHotel: 1500, houseCost: 200, mortgageValue: 175, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 2 } satisfies PropertyTile,

  // 38: Luxury Tax
  { id: 'tax-2', tileIndex: 38, name: 'Luxury Tax', type: 'tax', amount: 100 } satisfies TaxTile,

  // 39: Boardwalk
  { id: 'property-22', tileIndex: 39, name: 'Boardwalk', type: 'property', color: 'dark-blue', price: 400, rent: 50, rentWithOneHouse: 200, rentWithTwoHouses: 600, rentWithThreeHouses: 1400, rentWithFourHouses: 1700, rentWithHotel: 2000, houseCost: 200, mortgageValue: 200, ownerId: null, houses: 0, isHotel: false, isMortgaged: false, colorGroupCount: 2 } satisfies PropertyTile,
];

export const PROPERTY_SETS: Record<string, string[]> = {
  'brown': ['property-1', 'property-2'],
  'light-blue': ['property-3', 'property-4', 'property-5'],
  'pink': ['property-6', 'property-7', 'property-8'],
  'orange': ['property-9', 'property-10', 'property-11'],
  'red': ['property-12', 'property-13', 'property-14'],
  'yellow': ['property-15', 'property-16', 'property-17'],
  'green': ['property-18', 'property-19', 'property-20'],
  'dark-blue': ['property-21', 'property-22'],
};

export const PROPERTY_TILE_IDS: string[] = STANDARD_BOARD_TILES
  .filter((t): t is PropertyTile => t.type === 'property')
  .map(t => t.id);

export const RAILROAD_TILE_IDS: string[] = STANDARD_BOARD_TILES
  .filter((t): t is RailroadTile => t.type === 'railroad')
  .map(t => t.id);

export const UTILITY_TILE_IDS: string[] = STANDARD_BOARD_TILES
  .filter((t): t is UtilityTile => t.type === 'utility')
  .map(t => t.id);

export function getStandardBoard(): Tile[] {
  return STANDARD_BOARD_TILES.map(t => structuredClone(t));
}

export function getPropertySets(): Record<string, string[]> {
  return structuredClone(PROPERTY_SETS);
}
