import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalGameStore } from '../store/localGameStore.js';
import { SettingsModal } from '../components/SettingsModal.js';
import type { PlayerColor } from '@monopoly/shared';

const COLORS: { value: PlayerColor; label: string; cls: string }[] = [
  { value: 'red', label: 'Red', cls: 'bg-red-500' },
  { value: 'blue', label: 'Blue', cls: 'bg-blue-500' },
  { value: 'green', label: 'Green', cls: 'bg-green-500' },
  { value: 'yellow', label: 'Yellow', cls: 'bg-yellow-500' },
  { value: 'orange', label: 'Orange', cls: 'bg-orange-500' },
  { value: 'purple', label: 'Purple', cls: 'bg-purple-500' },
  { value: 'pink', label: 'Pink', cls: 'bg-pink-500' },
  { value: 'teal', label: 'Teal', cls: 'bg-teal-500' },
];

export function LocalSetupPage() {
  const navigate = useNavigate();
  const players = useLocalGameStore((s) => s.players);
  const addPlayer = useLocalGameStore((s) => s.addPlayer);
  const removePlayer = useLocalGameStore((s) => s.removePlayer);
  const startGame = useLocalGameStore((s) => s.startGame);
  const game = useLocalGameStore((s) => s.game);
  const openModal = useLocalGameStore((s) => s.openModal);
  const settings = useLocalGameStore((s) => s.settings);

  const [name, setName] = useState('');

  // Navigate away when game starts
  if (game) {
    navigate('/local/game', { replace: true });
  }

  function handleAdd() {
    if (!name.trim()) return;
    const usedColors = players.map((p) => p.color);
    const available = COLORS.find((c) => !usedColors.includes(c.value));
    if (!available) return;
    addPlayer(name.trim(), available.value);
    setName('');
  }

  const canStart = players.length >= 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-lg mx-auto">
        <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold mb-2">Local Hot-Seat Game</h1>
          <p className="text-gray-400 text-sm mb-6">
            Multiple players share this screen. Pass the device between turns.
          </p>

          {/* Add player */}
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              className="flex-1 px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-green-500 focus:outline-none"
              placeholder="Player name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              maxLength={20}
            />
            <button
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
              onClick={handleAdd}
              disabled={players.length >= 8}
            >
              Add
            </button>
          </div>

          {/* Player list */}
          <div className="space-y-2 mb-6">
            {players.length === 0 && (
              <div className="text-gray-500 text-sm text-center py-4">
                Add 2–8 players to start
              </div>
            )}
            {players.map((p, i) => {
              const color = COLORS.find((c) => c.value === p.color);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3"
                >
                  <div className={`w-4 h-4 rounded-full ${color?.cls ?? 'bg-gray-400'}`} />
                  <span className="font-medium">{p.name}</span>
                  {i === 0 && (
                    <span className="text-xs bg-yellow-600/30 text-yellow-400 px-2 py-0.5 rounded">
                      Starts
                    </span>
                  )}
                  <button
                    className="ml-auto text-red-400 hover:text-red-300 text-sm"
                    onClick={() => removePlayer(p.id)}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          {/* Settings summary */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-400">
              Players rotate in order you add them. First player goes first.
            </div>
            <button
              className="text-sm text-gray-400 hover:text-white transition flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-700"
              onClick={() => openModal('settings')}
            >
              ⚙️ House Rules
            </button>
          </div>

          {/* Active settings display */}
          <div className="flex flex-wrap gap-2 mb-6">
            {settings.freeParkingJackpot && (
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">Free Parking Pot</span>
            )}
            {settings.doubleMoneyOnGo && (
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">Double $ on GO</span>
            )}
            {settings.noAuctions && (
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">No Auctions</span>
            )}
            {settings.startingCash !== 1500 && (
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">Start: ${settings.startingCash}</span>
            )}
          </div>

          <button
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={startGame}
            disabled={!canStart}
          >
            {canStart ? `Start Game (${players.length} players)` : 'Add at least 2 players'}
          </button>
        </div>
      </div>
      <SettingsModal />
    </div>
  );
}
