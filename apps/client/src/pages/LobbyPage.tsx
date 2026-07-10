import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore.js';
import { useSocket, emitEvent } from '../hooks/useSocket.js';

export function LobbyPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  useSocket();

  const lobby = useGameStore((s) => s.lobby);
  const setLobbyCode = useGameStore((s) => s.setLobbyCode);
  const game = useGameStore((s) => s.game);

  useEffect(() => {
    if (code) setLobbyCode(code);
  }, [code]);

  useEffect(() => {
    if (game) {
      navigate(`/game/${game.id}`);
    }
  }, [game, navigate]);

  if (!lobby) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400 text-xl">Connecting to lobby...</div>
      </div>
    );
  }
  const lobbyData = lobby;

  const isHost = lobbyData.hostId === useGameStore.getState().playerId;

  function handleStart() {
    emitEvent('lobby:start-game', {});
  }

  function handleLeave() {
    emitEvent('lobby:leave', {});
    navigate('/');
  }

  function handleCopyCode() {
    const code = lobbyData?.code;
    if (code) navigator.clipboard.writeText(code);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Game Lobby</h1>
            <button
              className="text-gray-400 hover:text-white transition"
              onClick={handleLeave}
            >
              Leave
            </button>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-4 mb-6 text-center">
            <div className="text-sm text-gray-400 mb-1">Lobby Code</div>
            <div
              className="text-3xl font-mono font-bold tracking-[0.3em] text-green-400 cursor-pointer hover:text-green-300"
              onClick={handleCopyCode}
              title="Click to copy"
            >
              {lobbyData.code}
            </div>
            <div className="text-xs text-gray-500 mt-1">Click to copy</div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">
              Players ({lobbyData.players.length}/{lobbyData.settings.maxPlayers})
            </h2>
            <div className="space-y-2">
              {lobbyData.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-${player.color}-500`}
                    style={{ backgroundColor: player.color }}
                  />
                  <span className="font-medium">{player.name}</span>
                  {player.isHost && (
                    <span className="text-xs bg-yellow-600/30 text-yellow-400 px-2 py-0.5 rounded">
                      Host
                    </span>
                  )}
                  <span className={`ml-auto text-sm ${player.connected ? 'text-green-400' : 'text-gray-500'}`}>
                    {player.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Settings</h2>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
              <div>Starting Cash:</div>
              <div className="font-mono">${lobbyData.settings.startingCash}</div>
              <div>Free Parking Jackpot:</div>
              <div>{lobbyData.settings.freeParkingJackpot ? 'On' : 'Off'}</div>
              <div>Double Money on GO:</div>
              <div>{lobbyData.settings.doubleMoneyOnGo ? 'On' : 'Off'}</div>
              <div>Auctions:</div>
              <div>{lobbyData.settings.noAuctions ? 'Off' : 'On'}</div>
            </div>
          </div>

          {isHost && (
            <button
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleStart}
              disabled={lobbyData.players.length < 2}
            >
              {lobbyData.players.length < 2 ? 'Waiting for players...' : 'Start Game'}
            </button>
          )}

          {!isHost && (
            <div className="text-center text-gray-400 py-3">
              Waiting for host to start the game...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
