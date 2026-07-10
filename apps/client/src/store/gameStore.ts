import { create } from 'zustand';
import type { GameState, Lobby, DiceRoll } from '@monopoly/shared';

interface GameStore {
  // Connection
  socketConnected: boolean;
  setSocketConnected: (connected: boolean) => void;

  // Lobby
  lobby: Lobby | null;
  setLobby: (lobby: Lobby | null) => void;
  lobbyCode: string | null;
  setLobbyCode: (code: string | null) => void;

  // Game
  game: GameState | null;
  setGame: (game: GameState | null) => void;
  playerId: string | null;
  setPlayerId: (id: string | null) => void;

  // UI
  lastRoll: DiceRoll | null;
  setLastRoll: (roll: DiceRoll | null) => void;
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export interface ChatMessage {
  playerId: string;
  message: string;
  timestamp: number;
}

export const useGameStore = create<GameStore>((set) => ({
  socketConnected: false,
  setSocketConnected: (connected) => set({ socketConnected: connected }),

  lobby: null,
  setLobby: (lobby) => set({ lobby }),
  lobbyCode: null,
  setLobbyCode: (code) => set({ lobbyCode: code }),

  game: null,
  setGame: (game) => set({ game }),
  playerId: null,
  setPlayerId: (id) => set({ playerId: id }),

  lastRoll: null,
  setLastRoll: (roll) => set({ lastRoll: roll }),
  chatMessages: [],
  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  error: null,
  setError: (error) => set({ error }),
}));
