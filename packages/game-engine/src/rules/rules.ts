import type {
  Player, PropertyTile, RailroadTile, UtilityTile, Tile, GameSettings, GameState,
} from '@monopoly/shared';

export function canBuyProperty(player: Player, tile: Tile, _settings: GameSettings): { allowed: boolean; reason?: string } {
  if (tile.type !== 'property' && tile.type !== 'railroad' && tile.type !== 'utility') {
    return { allowed: false, reason: 'Tile is not purchasable' };
  }
  if (tile.ownerId) {
    return { allowed: false, reason: 'Property already owned' };
  }
  if (player.money < tile.price) {
    return { allowed: false, reason: 'Insufficient funds' };
  }
  return { allowed: true };
}

export function canBuildOnProperty(
  property: PropertyTile,
  player: Player,
  ownedInGroup: PropertyTile[],
  housesRemaining: number,
  hotelsRemaining: number,
): { allowed: boolean; reason?: string } {
  if (property.ownerId !== player.id) {
    return { allowed: false, reason: 'You do not own this property' };
  }
  if (property.isMortgaged) {
    return { allowed: false, reason: 'Cannot build on mortgaged property' };
  }
  const allSameOwned = ownedInGroup.every(p => p.ownerId === player.id);
  if (!allSameOwned) {
    return { allowed: false, reason: 'You must own all properties in the color group' };
  }
  if (property.houses === 4 && !property.isHotel) {
    if (hotelsRemaining <= 0) {
      return { allowed: false, reason: 'No hotels remaining' };
    }
    return { allowed: true };
  }
  if (property.houses < 4 && !property.isHotel) {
    if (housesRemaining <= 0) {
      return { allowed: false, reason: 'No houses remaining' };
    }
    const minHouses = Math.min(...ownedInGroup.map(p => p.houses));
    if (property.houses > minHouses) {
      return { allowed: false, reason: 'Even building rule: must build evenly across the color group' };
    }
    return { allowed: true };
  }
  if (property.isHotel) {
    return { allowed: false, reason: 'Property already has a hotel' };
  }
  return { allowed: false, reason: 'Cannot build on this property' };
}

export function canSellBuilding(
  property: PropertyTile,
  player: Player,
  ownedInGroup: PropertyTile[],
): { allowed: boolean; reason?: string } {
  if (property.ownerId !== player.id) {
    return { allowed: false, reason: 'You do not own this property' };
  }
  if (property.houses === 0 && !property.isHotel) {
    return { allowed: false, reason: 'No buildings to sell' };
  }
  const maxHouses = Math.max(...ownedInGroup.map(p => p.houses));
  if (property.houses < maxHouses && !property.isHotel) {
    return { allowed: false, reason: 'Even building rule: must sell evenly across the color group' };
  }
  return { allowed: true };
}

export function canMortgage(
  property: PropertyTile | RailroadTile | UtilityTile,
  _ownedProperties: (PropertyTile | RailroadTile | UtilityTile)[],
): { allowed: boolean; reason?: string } {
  if (property.isMortgaged) {
    return { allowed: false, reason: 'Already mortgaged' };
  }
  if (property.type === 'property' && !property.isHotel) {
    const prop = property as PropertyTile;
    if (prop.houses > 0) {
      return { allowed: false, reason: 'Must sell all houses first' };
    }
    if (prop.isHotel) {
      return { allowed: false, reason: 'Must sell hotel first' };
    }
  }
  return { allowed: true };
}

export function canUnmortgage(
  property: PropertyTile | RailroadTile | UtilityTile,
  player: Player,
): { allowed: boolean; reason?: string } {
  if (!property.isMortgaged) {
    return { allowed: false, reason: 'Not mortgaged' };
  }
  const cost = Math.ceil(property.mortgageValue * 1.1);
  if (player.money < cost) {
    return { allowed: false, reason: 'Insufficient funds to unmortgage' };
  }
  return { allowed: true };
}

export function canTradeProperty(
  property: PropertyTile | RailroadTile | UtilityTile,
  player: Player,
): { allowed: boolean; reason?: string } {
  if (property.ownerId !== player.id) {
    return { allowed: false, reason: 'You do not own this property' };
  }
  if (property.type === 'property') {
    const prop = property as PropertyTile;
    if (prop.houses > 0 || prop.isHotel) {
      return { allowed: false, reason: 'Must sell all buildings before trading' };
    }
  }
  return { allowed: true };
}

export function hasPlayerWon(game: GameState): string | null {
  const activePlayers = game.players.filter(p => !p.bankrupt);
  if (activePlayers.length === 1 && game.players.length > 1) {
    return activePlayers[0]?.id ?? null;
  }
  if (game.players.length === 1) {
    return game.players[0]?.id ?? null;
  }
  return null;
}

export function isGameOver(game: GameState): boolean {
  return hasPlayerWon(game) !== null;
}
