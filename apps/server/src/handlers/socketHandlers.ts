import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { PlayerColor, GameState } from '@monopoly/shared';
import { LobbyManager } from '../lobby/lobbyManager.js';
import { GameManager } from '../game/gameManager.js';
import { MonopolyEngine } from '@monopoly/game-engine';
import { v4 as uuid } from 'uuid';

const engine = new MonopolyEngine();

export function registerSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    console.log(`Player connected: ${socket.id}`);

    let currentLobbyId: string | null = null;

    // ── Lobby Events ──

    socket.on('lobby:create', (data: { settings?: Record<string, unknown> }) => {
      const lobby = LobbyManager.create(socket.id, data.settings as any);
      currentLobbyId = lobby.getId();
      lobby.addPlayer(socket.id, 'Host', 'red');
      socket.join(lobby.getId());
      socket.emit('lobby:created', { lobbyId: lobby.getId(), code: lobby.getCode() });
      socket.emit('lobby:updated', { lobby: lobby.getLobby() });
    });

    socket.on('lobby:join', (data: { code: string; playerName: string; playerColor: PlayerColor }) => {
      const lobby = LobbyManager.getByCode(data.code);
      if (!lobby) {
        socket.emit('error', { message: 'Lobby not found', code: 'LOBBY_NOT_FOUND' });
        return;
      }

      const success = lobby.addPlayer(socket.id, data.playerName, data.playerColor);
      if (!success) {
        socket.emit('error', { message: 'Could not join lobby', code: 'JOIN_FAILED' });
        return;
      }

      currentLobbyId = lobby.getId();

      socket.join(lobby.getId());
      io.to(lobby.getId()).emit('lobby:joined', {
        lobbyId: lobby.getId(),
        player: lobby.getPlayers().find(p => p.id === socket.id)!,
      });
      io.to(lobby.getId()).emit('lobby:updated', { lobby: lobby.getLobby() });
    });

    socket.on('lobby:leave', () => {
      if (!currentLobbyId) return;
      const lobby = LobbyManager.getById(currentLobbyId);
      if (!lobby) return;

      lobby.removePlayer(socket.id);
      socket.leave(currentLobbyId);

      if (lobby.getPlayers().length === 0) {
        LobbyManager.remove(currentLobbyId);
      } else {
        io.to(currentLobbyId).emit('lobby:left', { lobbyId: currentLobbyId, playerId: socket.id });
        io.to(currentLobbyId).emit('lobby:updated', { lobby: lobby.getLobby() });
      }

      currentLobbyId = null;
    });

    socket.on('lobby:update-settings', (data: { settings: Record<string, unknown> }) => {
      if (!currentLobbyId) return;
      const lobby = LobbyManager.getById(currentLobbyId);
      if (!lobby || !lobby.isHost(socket.id)) return;

      lobby.updateSettings(data.settings as any);
      io.to(currentLobbyId).emit('lobby:updated', { lobby: lobby.getLobby() });
    });

    socket.on('lobby:start-game', () => {
      if (!currentLobbyId) return;
      const lobby = LobbyManager.getById(currentLobbyId);
      if (!lobby || !lobby.isHost(socket.id)) return;
      if (lobby.getPlayers().length < 2) return;

      lobby.setStatus('in-game');
      const gameId = uuid();
      let game = engine.createGame(gameId, lobby.getLobby().settings);

      for (const player of lobby.getPlayers()) {
        game = engine.addPlayer(game, player.id, player.name, player.color, player.isHost);
      }

      game = engine.startGame(game);
      GameManager.setGame(gameId, game);

      for (const player of game.players) {
        GameManager.registerPlayer(player.id, gameId);
      }

      io.to(currentLobbyId).emit('game:started', { game });
      io.to(currentLobbyId).emit('lobby:updated', { lobby: lobby.getLobby() });
    });

    // ── Game Events ──

    socket.on('game:pay-tax-flat', () => {
      processGameAction(socket, io, (game) => {
        const updated = engine.payTaxFlat(game, socket.id);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:pay-tax-percentage', () => {
      processGameAction(socket, io, (game) => {
        const updated = engine.payTaxPercentage(game, socket.id);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:roll-dice', () => {
      processGameAction(socket, io, (game) => {
        const result = engine.rollDice(game, socket.id);
        GameManager.setGame(game.id, result.game);

        const newGame = result.game;
        io.to(currentLobbyId!).emit('game:dice-roll', { playerId: socket.id, roll: result.roll });
        io.to(currentLobbyId!).emit('game:state-update', { game: newGame });

        // Auto-resolve tile landing after rolling
        const currentPlayer = newGame.players.find(p => p.id === socket.id);
        if (currentPlayer && !currentPlayer.inJail) {
          const resolvedGame = engine.handleTileLanding(newGame, socket.id);
          GameManager.setGame(game.id, resolvedGame);
          io.to(currentLobbyId!).emit('game:state-update', { game: resolvedGame });
        }

        return result.game;
      });
    });

    socket.on('game:buy-property', () => {
      processGameAction(socket, io, (game) => {
        const updated = engine.buyProperty(game, socket.id);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:property-bought', { playerId: socket.id, propertyId: '' });
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:pass-auction', () => {
      processGameAction(socket, io, (game) => {
        const updated = engine.passAuction(game, socket.id);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:auction-bid', (data: { amount: number }) => {
      processGameAction(socket, io, (game) => {
        const updated = engine.placeAuctionBid(game, socket.id, data.amount);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:auction-bid', { playerId: socket.id, amount: data.amount });
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:build-house', (data: { propertyId: string }) => {
      processGameAction(socket, io, (game) => {
        const updated = engine.buildHouse(game, socket.id, data.propertyId);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:sell-house', (data: { propertyId: string }) => {
      processGameAction(socket, io, (game) => {
        const updated = engine.sellHouse(game, socket.id, data.propertyId);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:mortgage', (data: { propertyId: string }) => {
      processGameAction(socket, io, (game) => {
        const updated = engine.mortgage(game, socket.id, data.propertyId);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:unmortgage', (data: { propertyId: string }) => {
      processGameAction(socket, io, (game) => {
        const updated = engine.unmortgage(game, socket.id, data.propertyId);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:use-jail-card', () => {
      processGameAction(socket, io, (game) => {
        const updated = engine.useGetOutOfJail(game, socket.id);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:jail-update', { playerId: socket.id, inJail: false });
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:pay-jail-fine', () => {
      processGameAction(socket, io, (game) => {
        const updated = engine.payJail(game, socket.id);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:jail-update', { playerId: socket.id, inJail: false });
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:roll-for-jail', () => {
      processGameAction(socket, io, (game) => {
        const result = engine.rollForJail(game, socket.id);
        GameManager.setGame(game.id, result.game);
        io.to(currentLobbyId!).emit('game:dice-roll', { playerId: socket.id, roll: result.roll });
        io.to(currentLobbyId!).emit('game:state-update', { game: result.game });
        return result.game;
      });
    });

    socket.on('game:end-turn', () => {
      processGameAction(socket, io, (game) => {
        const updated = engine.endTurn(game, socket.id);
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

    socket.on('game:trade-offer', (data: { offer: any }) => {
      processGameAction(socket, io, (game) => {
        const { fromPlayerId, toPlayerId, offerProperties, offerMoney, requestProperties, requestMoney } = data.offer;
        const updated = engine.createTrade(game, fromPlayerId, toPlayerId, offerProperties, offerMoney, requestProperties, requestMoney);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:trade-offer', { offer: updated.tradeOffer! });
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:trade-accept', () => {
      processGameAction(socket, io, (game) => {
        const updated = engine.acceptTrade(game);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:trade-update', { offer: updated.tradeOffer! });
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('game:trade-reject', () => {
      processGameAction(socket, io, (game) => {
        const updated = engine.rejectTrade(game);
        GameManager.setGame(game.id, updated);
        io.to(currentLobbyId!).emit('game:state-update', { game: updated });
        return updated;
      });
    });

    socket.on('chat:message', (data: { message: string }) => {
      if (!currentLobbyId) return;
      io.to(currentLobbyId).emit('chat:message', {
        playerId: socket.id,
        message: data.message,
        timestamp: Date.now(),
      });
    });

    socket.on('game:reconnect', (data: { gameId: string; playerId: string }) => {
      const game = GameManager.getGame(data.gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found', code: 'GAME_NOT_FOUND' });
        return;
      }
      socket.emit('game:state-update', { game });
    });

    // ── Disconnect ──

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);

      if (currentLobbyId) {
        const lobby = LobbyManager.getById(currentLobbyId);
        if (lobby) {
          lobby.setPlayerConnected(socket.id, false);
          io.to(currentLobbyId).emit('lobby:updated', { lobby: lobby.getLobby() });
        }
      }

      currentLobbyId = null;
    });
  });
}

function processGameAction(
  socket: Socket,
  _io: SocketIOServer,
  action: (game: GameState) => GameState,
): void {
  const game = GameManager.getGameByPlayerId(socket.id);
  if (!game) {
    socket.emit('error', { message: 'No active game', code: 'NO_GAME' });
    return;
  }
  action(game);
}
