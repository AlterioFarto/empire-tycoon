import type { GameSettings } from '@monopoly/shared';

export const DEFAULT_GAME_SETTINGS: GameSettings = {
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

export function mergeSettings(base: GameSettings, overrides: Partial<GameSettings>): GameSettings {
  return { ...base, ...overrides };
}
