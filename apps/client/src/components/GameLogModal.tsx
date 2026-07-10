import { useState } from 'react';
import type { GameLogType } from '@monopoly/shared';
import { useLocalGameStore } from '../store/localGameStore.js';
import { Modal } from './Modal.js';

const LOG_TYPE_FILTERS: { value: GameLogType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'roll', label: 'Rolls' },
  { value: 'buy', label: 'Purchases' },
  { value: 'pay', label: 'Payments' },
  { value: 'card', label: 'Cards' },
  { value: 'jail', label: 'Jail' },
  { value: 'build', label: 'Building' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'trade', label: 'Trade' },
  { value: 'auction', label: 'Auctions' },
  { value: 'collect', label: 'Collections' },
  { value: 'system', label: 'System' },
];

const LOG_TYPE_COLORS: Partial<Record<GameLogType, string>> = {
  roll: 'text-gray-400',
  buy: 'text-green-400',
  pay: 'text-red-400',
  card: 'text-yellow-400',
  jail: 'text-orange-400',
  build: 'text-blue-400',
  mortgage: 'text-purple-400',
  trade: 'text-pink-400',
  auction: 'text-cyan-400',
  collect: 'text-green-300',
  bankrupt: 'text-red-500',
  win: 'text-yellow-300',
  system: 'text-gray-500',
};

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function GameLogModal() {
  const isOpen = useLocalGameStore((s) => s.activeModal === 'game-log');
  const closeModal = useLocalGameStore((s) => s.closeModal);
  const logs = useLocalGameStore((s) => s.game?.logs ?? []);

  const [filter, setFilter] = useState<GameLogType | 'all'>('all');

  if (!isOpen) return null;

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.type === filter);

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="Game Log" size="lg">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-1 mb-4">
        {LOG_TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            className={`text-xs px-2.5 py-1 rounded-full transition ${
              filter === f.value
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Log entries */}
      <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <div className="text-gray-500 text-sm text-center py-8">No log entries</div>
        )}
        {[...filtered].reverse().map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-2 py-1.5 border-b border-gray-700/50 last:border-0"
          >
            <span className="text-xs text-gray-600 font-mono whitespace-nowrap mt-0.5">
              {formatTimestamp(log.timestamp)}
            </span>
            <div className="flex-1 min-w-0">
              <span className={`text-sm ${LOG_TYPE_COLORS[log.type] ?? 'text-gray-400'}`}>
                {log.message}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-700 flex items-center justify-between">
        <span className="text-xs text-gray-500">{filtered.length} entries</span>
        <button
          className="text-gray-400 hover:text-white text-sm transition py-2 px-4"
          onClick={closeModal}
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
