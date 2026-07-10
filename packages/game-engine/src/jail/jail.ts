import type { Player, DiceRoll } from '@monopoly/shared';
import { JAIL_FINE, MAX_TURNS_WITHOUT_DOUBLES_IN_JAIL } from '@monopoly/shared';

export interface JailResult {
  player: Player;
  action: 'paid' | 'card' | 'rolled' | 'stayed';
  rolledDoubles?: boolean;
}

export function canPayJailFine(player: Player): boolean {
  return player.money >= JAIL_FINE;
}

export function canUseJailCard(player: Player): boolean {
  return player.getOutOfJailCards > 0;
}

export function payJailFine(player: Player): Player {
  return {
    ...player,
    money: player.money - JAIL_FINE,
    inJail: false,
    jailTurns: 0,
  };
}

export function useJailCard(player: Player): Player {
  return {
    ...player,
    getOutOfJailCards: player.getOutOfJailCards - 1,
    inJail: false,
    jailTurns: 0,
  };
}

export function processJailRoll(player: Player, roll: DiceRoll): JailResult {
  if (roll.isDoubles) {
    return {
      player: {
        ...player,
        inJail: false,
        jailTurns: 0,
      },
      action: 'rolled',
      rolledDoubles: true,
    };
  }

  const newPlayer = {
    ...player,
    jailTurns: player.jailTurns + 1,
  };

  if (newPlayer.jailTurns >= MAX_TURNS_WITHOUT_DOUBLES_IN_JAIL) {
    return {
      player: {
        ...newPlayer,
        money: newPlayer.money - JAIL_FINE,
        inJail: false,
        jailTurns: 0,
      },
      action: 'paid',
    };
  }

  return {
    player: newPlayer,
    action: 'stayed',
  };
}

export function getJailOptions(player: Player): string[] {
  const options: string[] = [];
  if (canPayJailFine(player)) options.push('pay');
  if (canUseJailCard(player)) options.push('card');
  options.push('roll');
  return options;
}
