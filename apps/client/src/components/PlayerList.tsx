import type { Player, TurnState } from '@monopoly/shared';

interface PlayerListProps {
  players: Player[];
  currentTurn: TurnState | null;
  playerId: string | null;
}

const PLAYER_BG: Record<string, string> = {
  red: 'bg-red-600/30 border-red-500',
  blue: 'bg-blue-600/30 border-blue-500',
  green: 'bg-green-600/30 border-green-500',
  yellow: 'bg-yellow-600/30 border-yellow-500',
  orange: 'bg-orange-600/30 border-orange-500',
  purple: 'bg-purple-600/30 border-purple-500',
  pink: 'bg-pink-600/30 border-pink-500',
  teal: 'bg-teal-600/30 border-teal-500',
};

export function PlayerList({ players, currentTurn, playerId }: PlayerListProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Players</h3>
      {players
        .filter((p) => !p.bankrupt)
        .sort((a, b) => (currentTurn?.playerId === a.id ? -1 : currentTurn?.playerId === b.id ? 1 : 0))
        .map((player) => {
          const isActive = currentTurn?.playerId === player.id;
          const isMe = player.id === playerId;

          return (
            <div
              key={player.id}
              className={`p-3 rounded-lg border ${PLAYER_BG[player.color] ?? 'bg-gray-700/30 border-gray-600'} ${isActive ? 'ring-2 ring-yellow-400' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full bg-${player.color}-400`} style={{ backgroundColor: player.color }} />
                  <span className="font-medium text-sm">
                    {player.name}
                    {isMe && <span className="text-gray-400 ml-1">(You)</span>}
                  </span>
                </div>
                <span className="font-mono text-sm text-green-400">${player.money}</span>
              </div>
              <div className="flex gap-2 mt-1 text-xs text-gray-400">
                {player.inJail && <span className="text-red-400">In Jail</span>}
                <span>{player.properties.length} properties</span>
              </div>
            </div>
          );
        })}
    </div>
  );
}
