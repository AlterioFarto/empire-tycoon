import type { PropertyTile, RailroadTile, UtilityTile, Tile } from '@monopoly/shared';
import { MAX_HOUSES_PER_PROPERTY, MORTGAGE_INTEREST_RATE } from '@monopoly/shared';

export function canBuildHotel(property: PropertyTile, playerMoney: number, houseCost: number): boolean {
  if (playerMoney < houseCost) return false;
  return property.houses === MAX_HOUSES_PER_PROPERTY && !property.isHotel;
}

export function canAddHouse(property: PropertyTile, playerMoney: number, houseCost: number): boolean {
  if (playerMoney < houseCost) return false;
  return property.houses < MAX_HOUSES_PER_PROPERTY && !property.isHotel;
}

export function addHouse(property: PropertyTile, playerMoney: number, houseCost: number): PropertyTile {
  if (playerMoney < houseCost) throw new Error('Insufficient funds');
  return { ...property, houses: property.houses + 1 };
}

export function removeHouse(property: PropertyTile): PropertyTile {
  return { ...property, houses: Math.max(0, property.houses - 1) };
}

export function buildHotel(property: PropertyTile, playerMoney: number, houseCost: number): PropertyTile {
  if (playerMoney < houseCost) throw new Error('Insufficient funds');
  return { ...property, houses: 0, isHotel: true };
}

export function sellHotel(property: PropertyTile): PropertyTile {
  return { ...property, isHotel: false, houses: MAX_HOUSES_PER_PROPERTY };
}

export function mortgageProperty<T extends PropertyTile | RailroadTile | UtilityTile>(property: T): T {
  return { ...property, isMortgaged: true };
}

export function unmortgageProperty<T extends PropertyTile | RailroadTile | UtilityTile>(property: T): T {
  return { ...property, isMortgaged: false };
}

export function getMortgageValue(property: PropertyTile | RailroadTile | UtilityTile): number {
  return property.mortgageValue;
}

export function getUnmortgageCost(property: PropertyTile | RailroadTile | UtilityTile): number {
  return Math.ceil(property.mortgageValue * (1 + MORTGAGE_INTEREST_RATE));
}

export function setOwner<T extends PropertyTile | RailroadTile | UtilityTile>(property: T, ownerId: string | null): T {
  return { ...property, ownerId };
}

export function isOwnable(tile: Tile): tile is PropertyTile | RailroadTile | UtilityTile {
  return tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility';
}

export function getHouseSellValue(property: PropertyTile): number {
  return Math.floor(property.houseCost / 2);
}

export function getHotelSellValue(property: PropertyTile): number {
  const hotelComponent = property.houseCost;
  const housesComponent = property.houseCost * MAX_HOUSES_PER_PROPERTY;
  return Math.floor((hotelComponent + housesComponent) / 2);
}
