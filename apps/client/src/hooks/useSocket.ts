import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import type { DiceRoll, GameState, Lobby, MonopolyCard } from '@monopoly/shared';
import { useGameStore } from '../store/gameStore.js';

const SOCKET_URL = 'http://localhost:4000';

let globalSocket: Socket | null = null;
let listenersRegistered = false;
let desiredGameId: string | null = null;

export function getStablePlayerId(): string {
  const key = 'monopoly:playerId';
  if (typeof window === 'undefined') return 'ssr-no-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('monopoly:sessionToken');
}

export function setSessionToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('monopoly:sessionToken', token);
}

function ensureSocket(): Socket {
  if (globalSocket?.connected) return globalSocket;

  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }

  if (!globalSocket.connected) {
    globalSocket.connect();
  }

  return globalSocket;
}

function requestReconnect(gameId: string): void {
  if (!globalSocket?.connected) return;
  const { playerId } = useGameStore.getState();
  const sessionToken = getSessionToken();
  if (!playerId || !sessionToken) return;
  globalSocket.emit('game:reconnect', { gameId, playerId, sessionToken });
}

function registerStoreListeners(): void {
  if (listenersRegistered) return;
  listenersRegistered = true;

  const store = useGameStore;
  const socket = globalSocket;
  if (!socket) return;

  socket.on('connect', () => {
    store.getState().setSocketConnected(true);
    // stable identity, not socket.id
    store.getState().setPlayerId(getStablePlayerId());
    // auto-reconnect to the route game or the game already in the store
    const { game } = store.getState();
    const gameId = desiredGameId ?? game?.id;
    if (gameId) requestReconnect(gameId);
  });

  socket.on('disconnect', () => {
    store.getState().setSocketConnected(false);
  });

  socket.on('session:issued', (data: { playerId: string; sessionToken: string }) => {
    setSessionToken(data.sessionToken);
    store.getState().setPlayerId(data.playerId);
  });

  socket.on('lobby:created', (data: { lobbyId: string; code: string }) => {
    store.getState().setLobbyCode(data.code);
  });

  socket.on('lobby:updated', (data: { lobby: Lobby }) => {
    store.getState().setLobby(data.lobby);
  });

  socket.on('game:started', (data: { game: GameState }) => {
    store.getState().setGame(data.game);
  });

  socket.on('game:state-update', (data: { game: GameState }) => {
    store.getState().setGame(data.game);
  });

  socket.on('game:dice-roll', (data: { playerId: string; roll: DiceRoll }) => {
    store.getState().setLastRoll(data.roll);
  });

  socket.on('game:card-drawn', (data: { playerId: string; card: MonopolyCard }) => {
    store.getState().setLastDrawnCard(data.card);
  });

  socket.on('chat:message', (data: { playerId: string; message: string; timestamp: number }) => {
    store.getState().addChatMessage(data);
  });

  socket.on('error', (data: { message: string; code: string }) => {
    store.getState().setError(data.message);
    setTimeout(() => store.getState().setError(null), 5000);
  });
}

export function getSocket(): Socket | null {
  return globalSocket;
}

/**
 * Initializes the singleton Socket.IO connection and registers
 * global store-bound event listeners exactly once.
 *
 * Pass the game id from the route so a page reload can reconnect
 * with the locally stored stable player id and session token.
 * Safe to call from any component - unmount does NOT disconnect.
 */
export function useSocket(gameId?: string): void {
  useEffect(() => {
    desiredGameId = gameId ?? null;
    ensureSocket();
    registerStoreListeners();
    const stable = getStablePlayerId();
    if (!useGameStore.getState().playerId) {
      useGameStore.getState().setPlayerId(stable);
    }
    if (gameId) requestReconnect(gameId);
  }, [gameId]);
}

export function emitEvent(event: string, data: Record<string, unknown> = {}): void {
  const sessionToken = getSessionToken();
  const payload = sessionToken ? { ...data, sessionToken } : data;
  globalSocket?.emit(event, payload);
}
