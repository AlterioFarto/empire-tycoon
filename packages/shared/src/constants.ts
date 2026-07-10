import type { GameSettings } from './types.js';

export const BOARD_SIZE = 40;
export const JAIL_TILE = 10;
export const GO_TILE = 0;
export const GO_TO_JAIL_TILE = 30;

export const MAX_TURNS_WITHOUT_DOUBLES_IN_JAIL = 3;
export const JAIL_FINE = 50;
export const JAIL_ROLL_LIMIT = 3;

export const TOTAL_HOUSES = 32;
export const TOTAL_HOTELS = 12;
export const MAX_HOUSES_PER_PROPERTY = 4;
export const HOTEL_HOUSE_COUNT = 4;

export const DEFAULT_SETTINGS: GameSettings = {
  startingCash: 1500,
  maxPlayers: 8,
  freeParkingJackpot: false,
  doubleMoneyOnGo: false,
  noAuctions: false,
  auctionType: 'standard',
  houseLimit: TOTAL_HOUSES,
  hotelLimit: TOTAL_HOTELS,
  turnTimeout: 60000,
  allowSpectators: true,
};

export const PLAYER_COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'teal'] as const;

export const ALLOWED_COLORS = new Set(PLAYER_COLORS);

export const LOBBY_CODE_LENGTH = 6;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

export const GO_SALARY = 200;
export const GO_DOUBLE_SALARY = 400;

export const INCOME_TAX_FLAT = 200;
export const INCOME_TAX_PERCENTAGE = 0.10;
export const LUXURY_TAX = 100;

export const RAILROAD_RENTS = [25, 50, 100, 200];
export const UTILITY_MULTIPLIER_ONE = 4;
export const UTILITY_MULTIPLIER_TWO = 10;

export const MORTGAGE_INTEREST_RATE = 0.10;

export const AUCTION_MIN_RAISE = 1;

export const FREE_PARKING_BASE = 0;
