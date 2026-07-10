import type { GameState, Tile, Player } from '@monopoly/shared';
import { getStandardBoard } from '@monopoly/shared';

export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
}

export function deserializeGameState(json: string): GameState {
  return JSON.parse(json) as GameState;
}

export function cloneGameState(state: GameState): GameState {
  return structuredClone(state);
}

export function createInitialGameState(
  id: string,
  players: Player[],
  settings: GameState['settings'],
): GameState {
  return {
    id,
    players,
    tiles: getStandardBoard(),
    chanceDeck: [],
    communityChestDeck: [],
    chanceDiscard: [],
    communityChestDiscard: [],
    currentTurn: null,
    turnOrder: players
      .filter(p => !p.bankrupt)
      .sort((a, b) => a.turnOrder - b.turnOrder)
      .map(p => p.id),
    turnIndex: 0,
    auction: null,
    tradeOffer: null,
    freeParkingMoney: 0,
    housesRemaining: settings.houseLimit,
    hotelsRemaining: settings.hotelLimit,
    settings,
    logs: [],
    startedAt: Date.now(),
    endedAt: null,
    winnerId: null,
    status: 'in-progress',
  };
}

export function updateTileInState(tiles: Tile[], updatedTile: Tile): Tile[] {
  return tiles.map(t => t.id === updatedTile.id ? updatedTile : t);
}

export function updatePlayerInState(players: Player[], updatedPlayer: Player): Player[] {
  return players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p);
}
