import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket, emitEvent } from '../hooks/useSocket.js';
import { useGameStore } from '../store/gameStore.js';

export function HomePage() {
  const navigate = useNavigate();
  useSocket();

  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerColor, setPlayerColor] = useState('red');
  const [showJoin, setShowJoin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colors = [
    { value: 'red', label: 'Red', class: 'bg-red-500' },
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
    { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
  ];

  function handleCreateLobby() {
    emitEvent('lobby:create', { settings: {} });

    const checkLobby = setInterval(() => {
      const { lobbyCode } = useGameStore.getState();
      if (lobbyCode) {
        clearInterval(checkLobby);
        navigate(`/lobby/${lobbyCode}`);
      }
    }, 100);

    setTimeout(() => clearInterval(checkLobby), 5000);
  }

  function handleJoinLobby() {
    if (!joinCode.trim()) {
      setError('Enter a lobby code');
      return;
    }
    if (!playerName.trim()) {
      setError('Enter your name');
      return;
    }

    emitEvent('lobby:join', {
      code: joinCode.toUpperCase(),
      playerName: playerName.trim(),
      playerColor,
    });

    const checkJoin = setInterval(() => {
      const { lobby } = useGameStore.getState();
      if (lobby) {
        clearInterval(checkJoin);
        navigate(`/lobby/${lobby.code}`);
      }
    }, 100);

    setTimeout(() => clearInterval(checkJoin), 5000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-4xl font-bold text-center mb-2 text-green-400">MONOPOLY</h1>
        <p className="text-gray-400 text-center mb-8">Online Multiplayer</p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Your Name</label>
          <input
            type="text"
            className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-green-500 focus:outline-none"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
          <div className="flex gap-2 flex-wrap">
            {colors.map((c) => (
              <button
                key={c.value}
                className={`w-8 h-8 rounded-full ${c.class} ${playerColor === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800' : ''}`}
                onClick={() => setPlayerColor(c.value)}
                aria-label={c.label}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition"
            onClick={handleCreateLobby}
          >
            Create Lobby
          </button>
          <button
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
            onClick={() => setShowJoin(!showJoin)}
          >
            Join Lobby
          </button>
        </div>

        {showJoin && (
          <div className="mt-4 space-y-3">
            <input
              type="text"
              className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none uppercase text-center tracking-widest"
              placeholder="LOBBY CODE"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
              onClick={handleJoinLobby}
            >
              Join Game
            </button>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-gray-500 text-xs text-center mb-3">or play locally</p>
          <button
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition"
            onClick={() => navigate('/local/setup')}
          >
            Local Hot-Seat Game
          </button>
        </div>
      </div>
    </div>
  );
}
