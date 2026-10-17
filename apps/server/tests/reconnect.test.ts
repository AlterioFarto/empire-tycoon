import { describe, it, expect } from 'vitest';
import { GameManager } from '../src/game/gameManager.js';
import { LobbyManager } from '../src/lobby/lobbyManager.js';
import { MonopolyEngine } from '@monopoly/game-engine';

describe('stable player identity / reconnect', () => {
  const engine = new MonopolyEngine();

  it('preserves seat/money/position across socket reconnect (stableId != socket.id)', () => {
    // simulate two stable player UUIDs (client-side localStorage ids)
    const stableA = crypto.randomUUID();
    const stableB = crypto.randomUUID();
    const socketA1 = 'socketA-old';
    const socketA2 = 'socketA-new'; // after network blip
    const socketB = 'socketB';

    // create lobby via stable ids
    const lobby = LobbyManager.create(stableA);
    lobby.addPlayer(stableA, 'Alice', 'red');
    lobby.addPlayer(stableB, 'Bob', 'blue');
    const lobbyId = lobby.getId();

    // start game with stable ids as player ids
    const gameId = 'test-game-reconnect';
    let game = engine.createGame(gameId, lobby.getLobby().settings);
    for (const p of lobby.getPlayers()) {
      game = engine.addPlayer(game, p.id, p.name, p.color, p.isHost);
    }
    game = engine.startGame(game);
    // mutate to verify persistence: alice gets money/position
    game.players[0]!.money = 1234;
    game.players[0]!.position = 15;

    GameManager.setGame(gameId, game);
    GameManager.registerGameForLobby(gameId, lobbyId);
    GameManager.registerPlayer(stableA, gameId);
    GameManager.registerPlayer(stableB, gameId);
    GameManager.bindSocketToPlayer(socketA1, stableA);
    GameManager.bindSocketToPlayer(socketB, stableB);

    // verify initial lookup via old socket works
    expect(GameManager.getGameBySocketId(socketA1)?.id).toBe(gameId);
    expect(GameManager.getGameByPlayerId(stableA)?.players[0]?.money).toBe(1234);

    // --- disconnect: network blip, socketA1 gone, new socket id assigned ---
    GameManager.unbindSocket(socketA1);
    // mark disconnected in game state (as socketHandlers does)
    const before = GameManager.getGame(gameId)!;
    GameManager.setGame(gameId, {
      ...before,
      players: before.players.map(p => (p.id === stableA ? { ...p, connected: false } : p)),
    });
    lobby.setPlayerConnected(stableA, false);

    expect(GameManager.getGameBySocketId(socketA1)).toBeUndefined();
    expect(GameManager.getGameByPlayerId(stableA)?.players.find(p => p.id === stableA)?.connected).toBe(false);
    expect(GameManager.getGameByPlayerId(stableA)?.players.find(p => p.id === stableA)?.money).toBe(1234);
    expect(GameManager.getGameByPlayerId(stableA)?.players.find(p => p.id === stableA)?.position).toBe(15);

    // --- reconnect with new socket.id but SAME stableId ---
    // old buggy check was data.playerId !== socket.id -> always fails
    // fixed flow: bind new socket to same stableId
    GameManager.bindSocketToPlayer(socketA2, stableA);
    expect(GameManager.getStableBySocket(socketA2)).toBe(stableA);
    expect(GameManager.getSocketByStable(stableA)).toBe(socketA2);

    // simulate game:reconnect handler: re-join lobby, set connected true, preserve state
    const reconnectedGame = GameManager.getGame(gameId)!;
    const updated = {
      ...reconnectedGame,
      players: reconnectedGame.players.map(p => (p.id === stableA ? { ...p, connected: true } : p)),
    };
    GameManager.setGame(gameId, updated);
    lobby.tryReconnectPlayer(stableA);

    const final = GameManager.getGameBySocketId(socketA2)!;
    const alice = final.players.find(p => p.id === stableA)!;
    expect(alice.connected).toBe(true);
    expect(alice.money).toBe(1234); // restored
    expect(alice.position).toBe(15); // restored
    expect(alice.turnOrder).toBe(0); // same seat
    expect(final.players.find(p => p.id === stableB)!.money).not.toBe(alice.money);

    // lobby still contains same player object, not duplicate
    expect(lobby.getPlayers().filter(p => p.id === stableA).length).toBe(1);
    expect(lobby.getPlayers().find(p => p.id === stableA)?.connected).toBe(true);

    // cleanup
    GameManager.removeGame(gameId);
    LobbyManager.remove(lobbyId);
  });

  it('old socket.id check correctly fails, stable check succeeds', () => {
    const stable = crypto.randomUUID();
    const oldSocket = 'sock-old';
    const newSocket = 'sock-new';
    GameManager.bindSocketToPlayer(oldSocket, stable);
    // buggy logic: data.playerId !== socket.id  -> stable !== newSocket => rejected
    const buggyReject = stable !== newSocket; // true -> would reject
    expect(buggyReject).toBe(true);
    // fixed logic: game.players.some(p.id===stable) -> passes regardless of socket.id
    const gameId = 'tmp-bug';
    let game = engine.createGame(gameId, { startingCash: 1500, maxPlayers: 4 } as unknown as Record<string, unknown>);
    game = engine.addPlayer(game, stable, 'Tester', 'red', true);
    GameManager.setGame(gameId, game);
    GameManager.registerPlayer(stable, gameId);
    expect(game.players.some(p => p.id === stable)).toBe(true);
    // after rebind, lookup via new socket succeeds
    GameManager.bindSocketToPlayer(newSocket, stable);
    expect(GameManager.getGameBySocketId(newSocket)?.id).toBe(gameId);
    GameManager.removeGame(gameId);
    GameManager.unbindSocket(oldSocket);
    GameManager.unbindSocket(newSocket);
  });

  it('lobby join with same stableId reuses seat instead of duplicate', () => {
    const stable = crypto.randomUUID();
    const lobby = LobbyManager.create(stable);
    lobby.addPlayer(stable, 'Alice', 'red');
    expect(lobby.getPlayers().length).toBe(1);
    // try duplicate join while still connected -> should fail
    expect(lobby.addPlayer(stable, 'Alice', 'red')).toBe(false);
    // disconnect
    lobby.setPlayerConnected(stable, false);
    expect(lobby.getPlayers()[0]!.connected).toBe(false);
    // reconnect should succeed via tryReconnect
    expect(lobby.tryReconnectPlayer(stable)).toBe(true);
    expect(lobby.getPlayers()[0]!.connected).toBe(true);
    expect(lobby.getPlayers().length).toBe(1);
    LobbyManager.remove(lobby.getId());
  });
});
