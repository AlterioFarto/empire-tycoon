import type { GameSettings } from '@monopoly/shared';
import { TOTAL_HOUSES, TOTAL_HOTELS } from '@monopoly/shared';

export interface BankState {
  money: number;
  housesRemaining: number;
  hotelsRemaining: number;
}

export function createBank(settings: GameSettings): BankState {
  return {
    money: Infinity,
    housesRemaining: settings.houseLimit ?? TOTAL_HOUSES,
    hotelsRemaining: settings.hotelLimit ?? TOTAL_HOTELS,
  };
}

export function canBuildHouse(bank: BankState): boolean {
  return bank.housesRemaining > 0;
}

export function bankHasHotels(bank: BankState): boolean {
  return bank.hotelsRemaining > 0;
}

export function useHouse(bank: BankState): BankState {
  return { ...bank, housesRemaining: bank.housesRemaining - 1 };
}

export function returnHouse(bank: BankState): BankState {
  return { ...bank, housesRemaining: bank.housesRemaining + 1 };
}

export function useHotel(bank: BankState): BankState {
  return { ...bank, hotelsRemaining: bank.hotelsRemaining - 1 };
}

export function returnHotel(bank: BankState): BankState {
  return { ...bank, hotelsRemaining: bank.hotelsRemaining + 1 };
}
