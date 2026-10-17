import type { GameState } from '@monopoly/shared';
import { MonopolyEngine } from '@monopoly/game-engine';

const ACTIVE_GAMES = new Map<string, GameState>();
const PLAYER_GAME_MAP = new Map<string, string>(); // stablePlayerId -> gameId
const LOBBY_GAME_MAP = new Map<string, string>(); // lobbyId -> gameId
const GAME_CREATED_AT = new Map<string, number>();
const SOCKET_TO_STABLE = new Map<string, string>(); // socket.id -> stableId
const STABLE_TO_SOCKET = new Map<string, string>(); // stableId -> socket.id

export class GameManager {
  static createGame(gameId: string, settings: Record<string, unknown>): GameState {
    const engine = new MonopolyEngine();
    const game = engine.createGame(gameId, settings);
    ACTIVE_GAMES.set(gameId, game);
    GAME_CREATED_AT.set(gameId, Date.now());
    return game;
  }

  static getGame(gameId: string): GameState | undefined {
    return ACTIVE_GAMES.get(gameId);
  }

  static getGameByPlayerId(playerId: string): GameState | undefined {
    // playerId is stableId
    const gameId = PLAYER_GAME_MAP.get(playerId);
    if (!gameId) return undefined;
    return ACTIVE_GAMES.get(gameId);
  }

  static getGameBySocketId(socketId: string): GameState | undefined {
    const stable = SOCKET_TO_STABLE.get(socketId);
    if (!stable) return undefined;
    return GameManager.getGameByPlayerId(stable);
  }

  static getGameByLobbyId(lobbyId: string): GameState | undefined {
    const gameId = LOBBY_GAME_MAP.get(lobbyId);
    if (!gameId) return undefined;
    return ACTIVE_GAMES.get(gameId);
  }

  static getLobbyIdByGameId(gameId: string): string | undefined {
    for (const [lobbyId, gid] of LOBBY_GAME_MAP) {
      if (gid === gameId) return lobbyId;
    }
    return undefined;
  }

  static setGame(gameId: string, game: GameState): void {
    ACTIVE_GAMES.set(gameId, game);
  }

  static registerGameForLobby(gameId: string, lobbyId: string): void {
    LOBBY_GAME_MAP.set(lobbyId, gameId);
  }

  static registerPlayer(playerId: string, gameId: string): void {
    PLAYER_GAME_MAP.set(playerId, gameId);
  }

  static unregisterPlayer(playerId: string): void {
    PLAYER_GAME_MAP.delete(playerId);
  }

  // socket <-> stable binding
  static bindSocketToPlayer(socketId: string, stableId: string): void {
    const oldSocket = STABLE_TO_SOCKET.get(stableId);
    if (oldSocket && oldSocket !== socketId) {
      SOCKET_TO_STABLE.delete(oldSocket);
    }
    const oldStable = SOCKET_TO_STABLE.get(socketId);
    if (oldStable && oldStable !== stableId) {
      STABLE_TO_SOCKET.delete(oldStable);
    }
    SOCKET_TO_STABLE.set(socketId, stableId);
    STABLE_TO_SOCKET.set(stableId, socketId);
  }

  static unbindSocket(socketId: string): string | undefined {
    const stable = SOCKET_TO_STABLE.get(socketId);
    if (stable) {
      SOCKET_TO_STABLE.delete(socketId);
      if (STABLE_TO_SOCKET.get(stable) === socketId) {
        STABLE_TO_SOCKET.delete(stable);
      }
    }
    return stable;
  }

  static getStableBySocket(socketId: string): string | undefined {
    return SOCKET_TO_STABLE.get(socketId);
  }

  static getSocketByStable(stableId: string): string | undefined {
    return STABLE_TO_SOCKET.get(stableId);
  }

  static removeGame(gameId: string): void {
    const game = ACTIVE_GAMES.get(gameId);
    if (game) {
      for (const player of game.players) {
        PLAYER_GAME_MAP.delete(player.id);
        const sock = STABLE_TO_SOCKET.get(player.id);
        if (sock) SOCKET_TO_STABLE.delete(sock);
        STABLE_TO_SOCKET.delete(player.id);
      }
      LOBBY_GAME_MAP.forEach((gid, lobbyId) => {
        if (gid === gameId) LOBBY_GAME_MAP.delete(lobbyId);
      });
      ACTIVE_GAMES.delete(gameId);
      GAME_CREATED_AT.delete(gameId);
    }
  }

  static removeGameIfCompleted(gameId: string): void {
    const game = ACTIVE_GAMES.get(gameId);
    if (game && game.status === 'completed') {
      GameManager.removeGame(gameId);
    }
  }

  static cleanupStaleGames(maxAgeMs: number): void {
    const now = Date.now();
    for (const [gameId, createdAt] of GAME_CREATED_AT) {
      if (now - createdAt > maxAgeMs) {
        GameManager.removeGame(gameId);
      }
    }
  }

  static getActiveGameCount(): number {
    return ACTIVE_GAMES.size;
  }
}
