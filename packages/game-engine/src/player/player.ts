import type { Player, PlayerColor } from '@monopoly/shared';

export function createPlayer(
  id: string,
  name: string,
  color: PlayerColor,
  startingCash: number,
  turnOrder: number,
  isHost: boolean = false,
): Player {
  return {
    id,
    name,
    color,
    money: startingCash,
    position: 0,
    properties: [],
    inJail: false,
    jailTurns: 0,
    getOutOfJailCards: 0,
    bankrupt: false,
    hasRolled: false,
    turnOrder,
    connected: true,
    isHost,
  };
}

export function addMoney(player: Player, amount: number): Player {
  return { ...player, money: player.money + amount };
}

export function deductMoney(player: Player, amount: number): Player {
  return { ...player, money: player.money - amount };
}

export function movePlayer(player: Player, position: number): Player {
  return { ...player, position };
}

export function addProperty(player: Player, propertyId: string): Player {
  return { ...player, properties: [...player.properties, propertyId] };
}

export function removeProperty(player: Player, propertyId: string): Player {
  return { ...player, properties: player.properties.filter(p => p !== propertyId) };
}

export function addJailCard(player: Player): Player {
  return { ...player, getOutOfJailCards: player.getOutOfJailCards + 1 };
}

export function removeJailCard(player: Player): Player {
  return { ...player, getOutOfJailCards: Math.max(0, player.getOutOfJailCards - 1) };
}

export function sendToJail(player: Player): Player {
  return { ...player, inJail: true, jailTurns: 0, position: 10 };
}

export function releaseFromJail(player: Player): Player {
  return { ...player, inJail: false, jailTurns: 0 };
}

export function incrementJailTurn(player: Player): Player {
  return { ...player, jailTurns: player.jailTurns + 1 };
}

export function setBankrupt(player: Player): Player {
  return { ...player, bankrupt: true };
}

export function setRolled(player: Player, rolled: boolean): Player {
  return { ...player, hasRolled: rolled };
}

export function canAfford(player: Player, amount: number): boolean {
  return player.money >= amount;
}

export function getTotalAssetValue(
  player: Player,
  propertyValues: Map<string, number>,
): number {
  let total = player.money;
  for (const propId of player.properties) {
    total += propertyValues.get(propId) ?? 0;
  }
  return total;
}
