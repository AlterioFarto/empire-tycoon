import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { PlayerColor, GameState } from '@monopoly/shared';
import { LobbyManager } from '../lobby/lobbyManager.js';
import { GameManager } from '../game/gameManager.js';
import { MonopolyEngine } from '@monopoly/game-engine';
import { v4 as uuid } from 'uuid';
import {
  isObject,
  isUuid,
  isValidPlayerColor,
  isValidPlayerName,
  isValidLobbyCode,
  isValidAmount,
  isValidPropertyId,
  propertyExists,
  validateSettings,
  validateTradeOffer,
  validateChatMessage,
} from '../validation/validators.js';

const engine = new MonopolyEngine();

function emitInvalid(socket: Socket, message: string): void {
  socket.emit('error', { message, code: 'INVALID_INPUT' });
}

export function registerSocketHandlers(io: SocketIOServer): void {
  const cleanupInterval = setInterval(() => {
    LobbyManager.cleanupExpiredLobbies();
    GameManager.cleanupStaleGames(2 * 60 * 60 * 1000);
  }, 60 * 1000);
  cleanupInterval.unref?.();

  io.on('connection', (socket: Socket) => {
    let currentLobbyId: string | null = null;
    let stablePlayerId: string | null = null;

    const getStable = (): string | null =>
      stablePlayerId ?? GameManager.getStableBySocket(socket.id) ?? null;

    const bindStable = (stableId: string): void => {
      stablePlayerId = stableId;
      GameManager.bindSocketToPlayer(socket.id, stableId);
    };

    // ── Lobby Events ──

    socket.on('lobby:create', (data: unknown) => {
      if (!isObject(data)) {
        emitInvalid(socket, 'lobby:create payload must be object');
        return;
      }
      const raw = data as Record<string, unknown>;
      // validate settings
      const settingsRes = validateSettings(raw.settings);
      if (!settingsRes.valid) {
        emitInvalid(socket, settingsRes.error!);
        return;
      }
      // playerId required strict
      const pid = raw.playerId;
      if (pid !== undefined && !isUuid(pid)) {
        emitInvalid(socket, 'playerId must be UUID');
        return;
      }
      const stableId = (pid as string | undefined) ?? null;
      if (!stableId) {
        emitInvalid(socket, 'playerId required');
        return;
      }
      if (raw.playerName !== undefined && typeof raw.playerName !== 'string') {
        emitInvalid(socket, 'playerName must be string');
        return;
      }
      if (raw.playerName !== undefined && !isValidPlayerName(raw.playerName)) {
        emitInvalid(socket, 'playerName must be 1-16 chars');
        return;
      }
      if (raw.playerColor !== undefined && !isValidPlayerColor(raw.playerColor)) {
        emitInvalid(socket, 'playerColor invalid');
        return;
      }
      bindStable(stableId);
      const lobby = LobbyManager.create(stableId, settingsRes.value as unknown as Record<string, unknown>);
      currentLobbyId = lobby.getId();
      const name = typeof raw.playerName === 'string' && raw.playerName.trim() ? raw.playerName.trim() : 'Host';
      const color = isValidPlayerColor(raw.playerColor) ? (raw.playerColor as PlayerColor) : 'red';
      // extra name check after default
      if (!isValidPlayerName(name)) {
        emitInvalid(socket, 'playerName must be 1-16 chars');
        LobbyManager.remove(lobby.getId());
        currentLobbyId = null;
        return;
      }
      const added = lobby.addPlayer(stableId, name, color);
      if (!added) {
        emitInvalid(socket, 'could not create lobby player');
        LobbyManager.remove(lobby.getId());
        currentLobbyId = null;
        return;
      }
      socket.join(lobby.getId());
      socket.emit('lobby:created', { lobbyId: lobby.getId(), code: lobby.getCode() });
      socket.emit('lobby:updated', { lobby: lobby.getLobby() });
    });

    socket.on('lobby:join', (data: unknown) => {
      if (!isObject(data)) {
        emitInvalid(socket, 'lobby:join payload must be object');
        return;
      }
      const raw = data as Record<string, unknown>;
      const { code, playerName, playerColor, playerId } = raw as {
        code: unknown;
        playerName: unknown;
        playerColor: unknown;
        playerId: unknown;
      };
      if (!isValidLobbyCode(code)) {
        emitInvalid(socket, 'code must be 6-char lobby code');
        return;
      }
      if (!isValidPlayerName(playerName)) {
        emitInvalid(socket, 'playerName must be 1-16 chars');
        return;
      }
      if (!isValidPlayerColor(playerColor)) {
        emitInvalid(socket, 'playerColor invalid');
        return;
      }
      if (!isUuid(playerId)) {
        emitInvalid(socket, 'playerId must be UUID');
        return;
      }
      const stableId = playerId as string;
      const lobby = LobbyManager.getByCode(code as string);
      if (!lobby) {
        socket.emit('error', { message: 'Lobby not found', code: 'LOBBY_NOT_FOUND' });
        return;
      }

      if (lobby.hasPlayer(stableId)) {
        lobby.tryReconnectPlayer(stableId);
        bindStable(stableId);
        currentLobbyId = lobby.getId();
        socket.join(lobby.getId());
        io.to(lobby.getId()).emit('lobby:updated', { lobby: lobby.getLobby() });
        socket.emit('lobby:joined', {
          lobbyId: lobby.getId(),
          player: lobby.getPlayers().find(p => p.id === stableId)!,
        });
        return;
      }

      const success = lobby.addPlayer(stableId, (playerName as string).trim(), playerColor as PlayerColor);
      if (!success) {
        socket.emit('error', { message: 'Could not join lobby', code: 'JOIN_FAILED' });
        return;
      }

      bindStable(stableId);
      currentLobbyId = lobby.getId();

      socket.join(lobby.getId());
      io.to(lobby.getId()).emit('lobby:joined', {
        lobbyId: lobby.getId(),
        player: lobby.getPlayers().find(p => p.id === stableId)!,
      });
      io.to(lobby.getId()).emit('lobby:updated', { lobby: lobby.getLobby() });
    });

    socket.on('lobby:leave', () => {
      const stable = getStable();
      if (!currentLobbyId || !stable) return;
      const lobby = LobbyManager.getById(currentLobbyId);
      if (!lobby) return;

      lobby.removePlayer(stable);
      socket.leave(currentLobbyId);

      if (lobby.getPlayers().length === 0) {
        LobbyManager.remove(currentLobbyId);
      } else {
        io.to(currentLobbyId).emit('lobby:left', { lobbyId: currentLobbyId, playerId: stable });
        io.to(currentLobbyId).emit('lobby:updated', { lobby: lobby.getLobby() });
      }

      currentLobbyId = null;
    });

    socket.on('lobby:update-settings', (data: unknown) => {
      if (!isObject(data)) {
        emitInvalid(socket, 'payload must be object');
        return;
      }
      const raw = data as Record<string, unknown>;
      const settingsRes = validateSettings(raw.settings);
      if (!settingsRes.valid) {
        emitInvalid(socket, settingsRes.error!);
        return;
      }
      const stable = getStable();
      if (!currentLobbyId || !stable) return;
      const lobby = LobbyManager.getById(currentLobbyId);
      if (!lobby || !lobby.isHost(stable)) return;

      lobby.updateSettings(settingsRes.value as unknown as Record<string, unknown>);
      io.to(currentLobbyId).emit('lobby:updated', { lobby: lobby.getLobby() });
    });

    socket.on('lobby:start-game', () => {
      const stable = getStable();
      if (!currentLobbyId || !stable) return;
      const lobby = LobbyManager.getById(currentLobbyId);
      if (!lobby || !lobby.isHost(stable)) return;
      if (lobby.getPlayers().length < 2) return;

      lobby.setStatus('in-game');
      const gameId = uuid();
      let game = engine.createGame(gameId, lobby.getLobby().settings);

      for (const player of lobby.getPlayers()) {
        game = engine.addPlayer(game, player.id, player.name, player.color, player.isHost);
      }

      game = engine.startGame(game);
      GameManager.setGame(gameId, game);
      GameManager.registerGameForLobby(gameId, currentLobbyId);

      for (const player of game.players) {
        GameManager.registerPlayer(player.id, gameId);
      }

      io.to(currentLobbyId).emit('game:started', { game });
      io.to(currentLobbyId).emit('lobby:updated', { lobby: lobby.getLobby() });
    });

    // ── Game Events ──

    socket.on('game:pay-tax-flat', () => {
      const stable = getStable();
      if (!stable) {
        emitInvalid(socket, 'not authenticated');
        return;
      }
      processGameAction(socket, stable, currentLobbyId, io, (game) => {
        const updated = engine.payTaxFlat(game, stable);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:pay-tax-percentage', () => {
      const stable = getStable();
      if (!stable) {
        emitInvalid(socket, 'not authenticated');
        return;
      }
      processGameAction(socket, stable, currentLobbyId, io, (game) => {
        const updated = engine.payTaxPercentage(game, stable);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:roll-dice', () => {
      const stable = getStable();
      if (!stable) {
        emitInvalid(socket, 'not authenticated');
        return;
      }
      processGameAction(socket, stable, currentLobbyId, io, (game) => {
        const result = engine.rollDice(game, stable);
        GameManager.setGame(game.id, result.game);

        const newGame = result.game;
        io.to(currentLobbyId!).emit('game:dice-roll', { playerId: stable, roll: result.roll });
        io.to(currentLobbyId!).emit('game:state-update', { game: newGame });

        const currentPlayer = newGame.players.find(p => p.id === stable);
        if (currentPlayer && !currentPlayer.inJail) {
          const resolvedGame = engine.handleTileLanding(newGame, stable);
          GameManager.setGame(game.id, resolvedGame);
          io.to(currentLobbyId!).emit('game:state-update', { game: resolvedGame });
        }

        return result.game;
      });
    });

    socket.on('game:buy-property', () => {
      const stable = getStable();
      if (!stable) {
        emitInvalid(socket, 'not authenticated');
        return;
      }
      processGameAction(socket, stable, currentLobbyId, io, (game) => {
        const updated = engine.buyProperty(game, stable);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:property-bought', { playerId: stable, propertyId: '' });
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:pass-auction', () => {
      const stable = getStable();
      if (!stable) {
        emitInvalid(socket, 'not authenticated');
        return;
      }
      processGameAction(socket, stable, currentLobbyId, io, (game) => {
        const updated = engine.passAuction(game, stable);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:auction-bid', (data: unknown) => {
      if (!isObject(data)) {
        emitInvalid(socket, 'auction-bid payload must be object');
        return;
      }
      const amount = (data as Record<string, unknown>).amount;
      if (!isValidAmount(amount)) {
        emitInvalid(socket, 'amount must be integer > 0');
        return;
      }
      const stable = getStable();
      if (!stable) {
        emitInvalid(socket, 'not authenticated');
        return;
      }
      processGameAction(socket, stable, currentLobbyId, io, (game) => {
        const updated = engine.placeAuctionBid(game, stable, amount as number);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:auction-bid', { playerId: stable, amount: amount as number });
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:build-house', (data: unknown) => {
      if (!isObject(data)) {
        emitInvalid(socket, 'payload must be object');
        return;
      }
      const propertyId = (data as Record<string, unknown>).propertyId;
      if (!isValidPropertyId(propertyId)) {
        emitInvalid(socket, 'propertyId invalid');
        return;
      }
      const stable = getStable();
      if (!stable) {
        emitInvalid(socket, 'not authenticated');
        return;
      }
      const gameCheck = GameManager.getGameByPlayerId(stable);
      if (gameCheck && !propertyExists(gameCheck, propertyId as string)) {
        emitInvalid(socket, 'property not found');
        return;
      }
      processGameAction(socket, stable, currentLobbyId, io, (game) => {
        if (!propertyExists(game, propertyId as string)) {
          throw new Error('property not found');
        }
        const updated = engine.buildHouse(game, stable, propertyId as string);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:sell-house', (data: unknown) => {
      if (!isObject(data)) {
        emitInvalid(socket, 'payload must be object');
        return;
      }
      const propertyId = (data as Record<string, unknown>).propertyId;
      if (!isValidPropertyId(propertyId)) {
        emitInvalid(socket, 'propertyId invalid');
        return;
      }
      const stable = getStable();
      if (!stable) {
        emitInvalid(socket, 'not authenticated');
        return;
      }
      const gameCheck = GameManager.getGameByPlayerId(stable);
      if (gameCheck && !propertyExists(gameCheck, propertyId as string)) {
        emitInvalid(socket, 'property not found');
        return;
      }
      processGameAction(socket, stable, currentLobbyId, io, (game) => {
        if (!propertyExists(game, propertyId as string)) throw new Error('property not found');
        const updated = engine.sellHouse(game, stable, propertyId as string);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:mortgage', (data: unknown) => {
      if (!isObject(data)) {
        emitInvalid(socket, 'payload must be object');
        return;
      }
      const propertyId = (data as Record<string, unknown>).propertyId;
      if (!isValidPropertyId(propertyId)) {
        emitInvalid(socket, 'propertyId invalid');
        return;
      }
      const stable = getStable();
      if (!stable) {
        emitInvalid(socket, 'not authenticated');
        return;
      }
      const gameCheck = GameManager.getGameByPlayerId(stable);
      if (gameCheck && !propertyExists(gameCheck, propertyId as string)) {
        emitInvalid(socket, 'property not found');
        return;
      }
      processGameAction(socket, stable, currentLobbyId, io, (game) => {
        if (!propertyExists(game, propertyId as string)) throw new Error('property not found');
        const updated = engine.mortgage(game, stable, propertyId as string);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:unmortgage', (data: unknown) => {
      if (!isObject(data)) {
        emitInvalid(socket, 'payload must be object');
        return;
      }
      const propertyId = (data as Record<string, unknown>).propertyId;
      if (!isValidPropertyId(propertyId)) {
        emitInvalid(socket, 'propertyId invalid');
        return;
      }
      const stable = getStable();
      if (!stable) {
        emitInvalid(socket, 'not authenticated');
        return;
      }
      const gameCheck = GameManager.getGameByPlayerId(stable);
      if (gameCheck && !propertyExists(gameCheck, propertyId as string)) {
        emitInvalid(socket, 'property not found');
        return;
      }
      processGameAction(socket, stable, currentLobbyId, io, (game) => {
        if (!propertyExists(game, propertyId as string)) throw new Error('property not found');
        const updated = engine.unmortgage(game, stable, propertyId as string);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:use-jail-card', () => {
      const stable = getStable();
      if (!stable) {
        emitInvalid(socket, 'not authenticated');
        return;
      }
      processGameAction(socket, stable, currentLobbyId, io, (game) => {
        const updated = engine.useGetOutOfJail(game, stable);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:jail-update', { playerId: stable, inJail: false });
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:pay-jail-fine', () => {
      const stable = getStable();
      if (!stable) {
        emitInvalid(socket, 'not authenticated');
        return;
      }
      processGameAction(socket, stable, currentLobbyId, io, (game) => {
        const updated = engine.payJail(game, stable);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:jail-update', { playerId: stable, inJail: false });
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:roll-for-jail', () => {
      const stable = getStable();
      if (!stable) {
        emitInvalid(socket, 'not authenticated');
        return;
      }
      processGameAction(socket, stable, currentLobbyId, io, (game) => {
        const result = engine.rollForJail(game, stable);
        GameManager.setGame(game.id, result.game);
        io.to(currentLobbyId!).emit('game:dice-roll', { playerId: stable, roll: result.roll });
        io.to(currentLobbyId!).emit('game:state-update', { game: result.game });
        return result.game;
      });
    });

    socket.on('game:end-turn', () => {
      const stable = getStable();
      if (!stable) {
        emitInvalid(socket, 'not authenticated');
        return;
      }
      processGameAction(socket, stable, currentLobbyId, io, (game) => {
        const updated = engine.endTurn(game, stable);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:turn-change', {
          playerId: updated.currentTurn?.playerId ?? '',
          phase: updated.currentTurn?.phase ?? 'waiting-to-roll',
        });
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });

        if (updated.winnerId) {
          io.to(currentLobbyId!).emit('game:player-won', { playerId: updated.winnerId });
        }
        return updated;
      });
    });

    socket.on('game:trade-offer', (data: unknown) => {
      if (!isObject(data)) {
        emitInvalid(socket, 'payload must be object');
        return;
      }
      const offer = (data as Record<string, unknown>).offer;
      const stable = getStable();
      if (!stable) {
        emitInvalid(socket, 'not authenticated');
        return;
      }
      const game = GameManager.getGameByPlayerId(stable);
      if (!game) {
        socket.emit('error', { message: 'No active game', code: 'NO_GAME' });
        return;
      }
      const res = validateTradeOffer(offer, game);
      if (!res.valid) {
        emitInvalid(socket, res.error!);
        return;
      }
      processGameAction(socket, stable, currentLobbyId, io, (g) => {
        const o = offer as {
          toPlayerId: string;
          offerProperties: string[];
          offerMoney: number;
          requestProperties: string[];
          requestMoney: number;
        };
        const updated = engine.createTrade(g, stable, o.toPlayerId, o.offerProperties, o.offerMoney, o.requestProperties, o.requestMoney);
        GameManager.setGame(g.id, updated);
        io.to(currentLobbyId!).emit('game:trade-offer', { offer: updated.tradeOffer! });
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:trade-accept', () => {
      const stable = getStable();
      if (!stable) {
        emitInvalid(socket, 'not authenticated');
        return;
      }
      processGameAction(socket, stable, currentLobbyId, io, (game) => {
        const updated = engine.acceptTrade(game);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:trade-update', { offer: updated.tradeOffer! });
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:trade-reject', () => {
      const stable = getStable();
      if (!stable) {
        emitInvalid(socket, 'not authenticated');
        return;
      }
      processGameAction(socket, stable, currentLobbyId, io, (game) => {
        const updated = engine.rejectTrade(game);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('chat:message', (data: unknown) => {
      if (!currentLobbyId) return;
      const res = validateChatMessage(data);
      if (!res.valid) {
        emitInvalid(socket, res.error!);
        return;
      }
      const stable = getStable() ?? socket.id;
      const msg = ((data as Record<string, unknown>).message as string).trim().slice(0, 500);
      io.to(currentLobbyId).emit('chat:message', {
        playerId: stable,
        message: msg,
        timestamp: Date.now(),
      });
    });

    socket.on('game:reconnect', (data: unknown) => {
      if (!isObject(data)) {
        emitInvalid(socket, 'payload must be object');
        return;
      }
      const raw = data as Record<string, unknown>;
      const gameId = raw.gameId;
      const playerId = raw.playerId;
      if (!isUuid(gameId)) {
        emitInvalid(socket, 'gameId must be UUID');
        return;
      }
      if (!isUuid(playerId)) {
        emitInvalid(socket, 'playerId must be UUID');
        return;
      }
      const stableId = playerId as string;
      const game = GameManager.getGame(gameId as string);
      if (!game) {
        socket.emit('error', { message: 'Game not found', code: 'GAME_NOT_FOUND' });
        return;
      }
      if (!game.players.some(p => p.id === stableId)) {
        socket.emit('error', { message: 'Not in game', code: 'NOT_IN_GAME' });
        return;
      }
      bindStable(stableId);
      GameManager.registerPlayer(stableId, gameId as string);

      const lobbyId = GameManager.getLobbyIdByGameId(gameId as string) ?? LobbyManager.getByPlayerId(stableId)?.getId();
      if (lobbyId) {
        currentLobbyId = lobbyId;
        socket.join(lobbyId);
        const lobby = LobbyManager.getById(lobbyId);
        if (lobby) lobby.setPlayerConnected(stableId, true);
      }

      const updatedGame: GameState = {
        ...game,
        players: game.players.map(p =>
          p.id === stableId ? { ...p, connected: true } : p,
        ),
      };
      GameManager.setGame(game.id, updatedGame);
      if (currentLobbyId) {
        const lm = LobbyManager.getById(currentLobbyId);
        if (lm) io.to(currentLobbyId).emit('lobby:updated', { lobby: lm.getLobby() });
      }
      socket.emit('game:state-update', { game: GameManager.getGame(gameId as string) });
    });

    // ── Disconnect ──

    socket.on('disconnect', () => {
      const stable = GameManager.getStableBySocket(socket.id) ?? stablePlayerId;
      GameManager.unbindSocket(socket.id);

      if (currentLobbyId && stable) {
        const lobby = LobbyManager.getById(currentLobbyId);
        if (lobby) {
          lobby.setPlayerConnected(stable, false);
          io.to(currentLobbyId).emit('lobby:updated', { lobby: lobby.getLobby() });
          if (lobby.getPlayers().every(p => !p.connected)) {
            LobbyManager.remove(currentLobbyId);
            const lobbyGame = GameManager.getGameByLobbyId(currentLobbyId);
            if (lobbyGame) GameManager.removeGame(lobbyGame.id);
          }
        }
      } else if (stable) {
        const lobbyByPlayer = LobbyManager.getByPlayerId(stable);
        if (lobbyByPlayer) {
          lobbyByPlayer.setPlayerConnected(stable, false);
          io.to(lobbyByPlayer.getId()).emit('lobby:updated', { lobby: lobbyByPlayer.getLobby() });
        }
      }

      if (stable) {
        const game = GameManager.getGameByPlayerId(stable);
        if (game) {
          GameManager.setGame(game.id, {
            ...game,
            players: game.players.map(p =>
              p.id === stable ? { ...p, connected: false } : p,
            ),
          });
        }
      }

      currentLobbyId = null;
    });
  });
}

function processGameAction(
  socket: Socket,
  stableId: string,
  roomId: string | null,
  _io: SocketIOServer,
  action: (game: GameState) => GameState,
): void {
  if (!roomId || !socket.rooms.has(roomId)) {
    socket.emit('error', { message: 'Not in a lobby', code: 'NOT_IN_LOBBY' });
    return;
  }

  const game = GameManager.getGameByPlayerId(stableId);
  if (!game) {
    socket.emit('error', { message: 'No active game', code: 'NO_GAME' });
    return;
  }

  const player = game.players.find(p => p.id === stableId);
  if (!player || player.bankrupt || !player.connected) {
    socket.emit('error', { message: 'Player not eligible', code: 'PLAYER_INVALID' });
    return;
  }

  try {
    const updated = action(game);
    GameManager.removeGameIfCompleted(updated.id);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'action failed';
    socket.emit('error', { message: msg, code: 'ACTION_FAILED' });
  }
}
