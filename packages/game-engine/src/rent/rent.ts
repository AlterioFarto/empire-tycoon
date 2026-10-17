import type { PropertyTile, RailroadTile, UtilityTile, DiceRoll, Player } from '@monopoly/shared';
import { RAILROAD_RENTS, UTILITY_MULTIPLIER_ONE, UTILITY_MULTIPLIER_TWO } from '@monopoly/shared';

export function calculatePropertyRent(property: PropertyTile, totalInGroup: number): number {
  if (property.isMortgaged) return 0;
  if (property.isHotel) return property.rentWithHotel;
  if (property.houses > 0) {
    const maxHouses = 4;
    const clampedHouses = Math.min(property.houses, maxHouses);
    const rents = [
      property.rent,
      property.rentWithOneHouse,
      property.rentWithTwoHouses,
      property.rentWithThreeHouses,
      property.rentWithFourHouses,
    ];
    return rents[clampedHouses] ?? property.rent;
  }
  if (totalInGroup === property.colorGroupCount && property.ownerId) {
    return property.rent * 2;
  }
  return property.rent;
}

export function calculateRailroadRent(
  railroad: RailroadTile,
  ownedRailroadsCount: number,
): number {
  if (railroad.isMortgaged) return 0;
  if (ownedRailroadsCount < 1) return 0;
  const index = Math.min(ownedRailroadsCount - 1, RAILROAD_RENTS.length - 1);
  return RAILROAD_RENTS[index]!;
}

export function calculateUtilityRent(
  utility: UtilityTile,
  ownedUtilitiesCount: number,
  diceRoll: DiceRoll,
): number {
  if (utility.isMortgaged) return 0;
  if (ownedUtilitiesCount < 1) return 0;
  const multiplier = ownedUtilitiesCount === 2 ? UTILITY_MULTIPLIER_TWO : UTILITY_MULTIPLIER_ONE;
  return diceRoll.total * multiplier;
}

export function calculateRentForTile(
  tile: PropertyTile | RailroadTile | UtilityTile,
  _owner: Player,
  diceRoll: DiceRoll | null,
  ownedInGroup: number,
): number {
  switch (tile.type) {
    case 'property':
      return calculatePropertyRent(tile, ownedInGroup);
    case 'railroad':
      return calculateRailroadRent(tile, ownedInGroup);
    case 'utility':
      if (!diceRoll) return 0;
      return calculateUtilityRent(tile, ownedInGroup, diceRoll);
    default:
      return 0;
  }
}
