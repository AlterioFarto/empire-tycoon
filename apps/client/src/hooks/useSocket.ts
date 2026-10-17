import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { useGameStore } from '../store/gameStore.js';

const SOCKET_URL = 'http://localhost:4000';

let globalSocket: Socket | null = null;
let listenersRegistered = false;

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
    // auto-reconnect if we have an active game
    const { game, playerId } = store.getState();
    if (game && playerId) {
      socket.emit('game:reconnect', { gameId: game.id, playerId });
    }
  });

  socket.on('disconnect', () => {
    store.getState().setSocketConnected(false);
  });

  socket.on('lobby:created', (data: { lobbyId: string; code: string }) => {
    store.getState().setLobbyCode(data.code);
  });

  socket.on('lobby:updated', (data: { lobby: any }) => {
    store.getState().setLobby(data.lobby);
  });

  socket.on('game:started', (data: { game: any }) => {
    store.getState().setGame(data.game);
  });

  socket.on('game:state-update', (data: { game: any }) => {
    store.getState().setGame(data.game);
  });

  socket.on('game:dice-roll', (data: { playerId: string; roll: any }) => {
    store.getState().setLastRoll(data.roll);
  });

  socket.on('chat:message', (data: { playerId: string; message: string; timestamp: number }) => {
    store.getState().addChatMessage(data);
  });

  socket.on('error', (data: { message: string; code: string }) => {
    // ignore reconnect noise if already handled
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
 * Safe to call from any component – unmount does NOT disconnect.
 */
export function useSocket(): Socket | null {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = ensureSocket();
    socketRef.current = socket;
    registerStoreListeners();
    // ensure stable id is persisted immediately
    const stable = getStablePlayerId();
    if (!useGameStore.getState().playerId) {
      useGameStore.getState().setPlayerId(stable);
    }

    return () => {
      socketRef.current = null;
    };
  }, []);

  return socketRef.current;
}

export function emitEvent(event: string, data?: Record<string, unknown>): void {
  globalSocket?.emit(event, data);
}
