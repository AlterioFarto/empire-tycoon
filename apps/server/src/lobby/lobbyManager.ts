import type { Lobby, Player, GameSettings, PlayerColor } from '@monopoly/shared';
import { LOBBY_CODE_LENGTH, DEFAULT_SETTINGS } from '@monopoly/shared';
import { v4 as uuid } from 'uuid';

const ACTIVE_LOBBIES = new Map<string, LobbyManager>();
const CODE_TO_LOBBY = new Map<string, string>();

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < LOBBY_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class LobbyManager {
  private lobby: Lobby;

  constructor(hostId: string, settings?: Partial<GameSettings>) {
    let code: string;
    do {
      code = generateCode();
    } while (CODE_TO_LOBBY.has(code));

    this.lobby = {
      id: uuid(),
      code,
      hostId,
      players: [],
      spectators: [],
      settings: { ...DEFAULT_SETTINGS, ...settings },
      status: 'open',
      createdAt: Date.now(),
    };
  }

  static create(hostId: string, settings?: Partial<GameSettings>): LobbyManager {
    const manager = new LobbyManager(hostId, settings);
    ACTIVE_LOBBIES.set(manager.getId(), manager);
    CODE_TO_LOBBY.set(manager.getCode(), manager.getId());
    return manager;
  }

  static getByCode(code: string): LobbyManager | undefined {
    const id = CODE_TO_LOBBY.get(code.toUpperCase());
    if (!id) return undefined;
    return ACTIVE_LOBBIES.get(id);
  }

  static getById(id: string): LobbyManager | undefined {
    return ACTIVE_LOBBIES.get(id);
  }

  static remove(id: string): void {
    const manager = ACTIVE_LOBBIES.get(id);
    if (manager) {
      CODE_TO_LOBBY.delete(manager.getCode());
      ACTIVE_LOBBIES.delete(id);
    }
  }

  getId(): string {
    return this.lobby.id;
  }

  getCode(): string {
    return this.lobby.code;
  }

  getLobby(): Lobby {
    return this.lobby;
  }

  getPlayers(): Player[] {
    return this.lobby.players;
  }

  getHostId(): string {
    return this.lobby.hostId;
  }

  isHost(playerId: string): boolean {
    return this.lobby.hostId === playerId;
  }

  addPlayer(playerId: string, name: string, color: PlayerColor): boolean {
    if (this.lobby.status !== 'open') return false;
    if (this.lobby.players.length >= this.lobby.settings.maxPlayers) return false;

    const colorTaken = this.lobby.players.some(p => p.color === color);
    if (colorTaken) return false;

    const player: Player = {
      id: playerId,
      name,
      color,
      money: this.lobby.settings.startingCash,
      position: 0,
      properties: [],
      inJail: false,
      jailTurns: 0,
      getOutOfJailCards: 0,
      bankrupt: false,
      hasRolled: false,
      turnOrder: this.lobby.players.length,
      connected: true,
      isHost: this.lobby.players.length === 0,
    };

    this.lobby.players.push(player);
    return true;
  }

  removePlayer(playerId: string): void {
    this.lobby.players = this.lobby.players.filter(p => p.id !== playerId);
    if (this.lobby.players.length > 0 && this.lobby.hostId === playerId) {
      this.lobby.hostId = this.lobby.players[0]!.id;
      this.lobby.players[0]!.isHost = true;
    }
    if (this.lobby.players.length === 0) {
      LobbyManager.remove(this.lobby.id);
    }
  }

  updateSettings(settings: Partial<GameSettings>): void {
    this.lobby.settings = { ...this.lobby.settings, ...settings };
  }

  setStatus(status: Lobby['status']): void {
    this.lobby.status = status;
  }

  setPlayerConnected(playerId: string, connected: boolean): void {
    const player = this.lobby.players.find(p => p.id === playerId);
    if (player) {
      player.connected = connected;
    }
  }
}
