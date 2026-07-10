import type { GameState } from '@monopoly/shared';
import { MonopolyEngine } from '@monopoly/game-engine';

const ACTIVE_GAMES = new Map<string, GameState>();
const PLAYER_GAME_MAP = new Map<string, string>();

export class GameManager {
  static createGame(gameId: string, settings: any): GameState {
    const engine = new MonopolyEngine();
    const game = engine.createGame(gameId, settings);
    ACTIVE_GAMES.set(gameId, game);
    return game;
  }

  static getGame(gameId: string): GameState | undefined {
    return ACTIVE_GAMES.get(gameId);
  }

  static getGameByPlayerId(playerId: string): GameState | undefined {
    const gameId = PLAYER_GAME_MAP.get(playerId);
    if (!gameId) return undefined;
    return ACTIVE_GAMES.get(gameId);
  }

  static setGame(gameId: string, game: GameState): void {
    ACTIVE_GAMES.set(gameId, game);
  }

  static registerPlayer(playerId: string, gameId: string): void {
    PLAYER_GAME_MAP.set(playerId, gameId);
  }

  static unregisterPlayer(playerId: string): void {
    PLAYER_GAME_MAP.delete(playerId);
  }

  static removeGame(gameId: string): void {
    const game = ACTIVE_GAMES.get(gameId);
    if (game) {
      for (const player of game.players) {
        PLAYER_GAME_MAP.delete(player.id);
      }
      ACTIVE_GAMES.delete(gameId);
    }
  }
}
