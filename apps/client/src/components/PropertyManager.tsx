import { useLocalGameStore } from '../store/localGameStore.js';
import { Modal } from './Modal.js';
import type { PropertyTile, RailroadTile, UtilityTile } from '@monopoly/shared';

const COLOR_MAP: Record<string, string> = {
  brown: '#8B4513',
  'light-blue': '#87CEEB',
  pink: '#FF69B4',
  orange: '#FF8C00',
  red: '#DC143C',
  yellow: '#FFD700',
  green: '#228B22',
  'dark-blue': '#00008B',
};

export function PropertyManager() {
  const isOpen = useLocalGameStore((s) => s.activeModal === 'manage-properties');
  const closeModal = useLocalGameStore((s) => s.closeModal);
  const game = useLocalGameStore((s) => s.game);
  const currentTurn = useLocalGameStore((s) => s.game?.currentTurn);
  const buildHouse = useLocalGameStore((s) => s.buildHouse);
  const sellHouse = useLocalGameStore((s) => s.sellHouse);
  const mortgage = useLocalGameStore((s) => s.mortgage);
  const unmortgage = useLocalGameStore((s) => s.unmortgage);

  if (!isOpen || !game || !currentTurn) return null;

  const currentPlayer = game.players.find((p) => p.id === currentTurn.playerId);
  if (!currentPlayer) return null;

  // A house can only be built when the player owns the full color set (and not maxed/mortgaged).
  const canBuildFor = (t: PropertyTile): boolean => {
    const group = game.tiles.filter(
      (x) => x.type === 'property' && (x as PropertyTile).color === t.color,
    ) as PropertyTile[];
    const fullSet = group.every((p) => p.ownerId === currentPlayer.id);
    return fullSet && !t.isMortgaged && !t.isHotel && t.houses < 4;
  };

  const ownedTiles = game.tiles.filter(
    (t) =>
      (t.type === 'property' || t.type === 'railroad' || t.type === 'utility') &&
      (t as PropertyTile | RailroadTile | UtilityTile).ownerId === currentPlayer.id,
  ) as (PropertyTile | RailroadTile | UtilityTile)[];

  const propertyTiles = ownedTiles.filter((t) => t.type === 'property') as PropertyTile[];

  // Group properties by color
  const grouped: Record<string, PropertyTile[]> = {};
  for (const p of propertyTiles) {
    if (!grouped[p.color]) grouped[p.color] = [];
    grouped[p.color]!.push(p);
  }

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="Manage Properties" size="lg">
      <div className="space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-400">
            {ownedTiles.length} propert{ownedTiles.length === 1 ? 'y' : 'ies'} owned
          </span>
          <span className="text-green-400 font-mono">${currentPlayer.money}</span>
        </div>

        {/* Railroad & Utility */}
        {ownedTiles.filter((t) => t.type !== 'property').length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Railroads & Utilities
            </h4>
            <div className="space-y-1">
              {ownedTiles
                .filter((t) => t.type !== 'property')
                .map((tile) => (
                  <PropertyRow
                    key={tile.id}
                    tile={tile}
                    onBuild={() => {}}
                    onSell={() => {}}
                    onMortgage={() => {
                      mortgage(tile.id);
                    }}
                    onUnmortgage={() => {
                      unmortgage(tile.id);
                    }}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Properties by color group */}
        {Object.entries(grouped).map(([color, tiles]) => (
          <div key={color}>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: COLOR_MAP[color] ?? '#6b7280' }}
              />
              {color.replace('-', ' ')}
              <span className="text-gray-500">({tiles.length})</span>
            </h4>
            <div className="space-y-1">
              {tiles.map((tile) => (
                <PropertyRow
                  key={tile.id}
                  tile={tile}
                  canBuild={canBuildFor(tile)}
                  onBuild={() => {
                    buildHouse(tile.id);
                  }}
                  onSell={() => {
                    sellHouse(tile.id);
                  }}
                  onMortgage={() => {
                    mortgage(tile.id);
                  }}
                  onUnmortgage={() => {
                    unmortgage(tile.id);
                  }}
                />
              ))}
            </div>
          </div>
        ))}

        {ownedTiles.length === 0 && (
          <div className="text-gray-500 text-sm text-center py-8">
            You don't own any properties yet.
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-700 flex justify-end">
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

function PropertyRow({
  tile,
  canBuild,
  onBuild,
  onSell,
  onMortgage,
  onUnmortgage,
}: {
  tile: PropertyTile | RailroadTile | UtilityTile;
  canBuild?: boolean;
  onBuild: () => void;
  onSell: () => void;
  onMortgage: () => void;
  onUnmortgage: () => void;
}) {
  const isProperty = tile.type === 'property';
  const prop = isProperty ? (tile as PropertyTile) : null;
  const mortgaged = tile.isMortgaged;

  return (
    <div
      className={`flex items-center gap-3 bg-gray-700/30 rounded-lg px-3 py-2 ${
        mortgaged ? 'opacity-60' : ''
      }`}
    >
      {/* Color dot */}
      {isProperty && (
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: COLOR_MAP[prop!.color] ?? '#6b7280' }}
        />
      )}
      {!isProperty && (
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-gray-500" />
      )}

      {/* Name */}
      <span className="text-sm text-white flex-1 truncate">{tile.name}</span>

      {/* Buildings indicator */}
      {isProperty && prop && (
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {prop.isHotel ? '🏨' : prop.houses > 0 ? `🏠×${prop.houses}` : '—'}
        </span>
      )}

      {/* Mortgaged badge */}
      {mortgaged && (
        <span className="text-xs text-red-400 font-medium whitespace-nowrap">Mortgaged</span>
      )}

      {/* Action buttons */}
      {!mortgaged && isProperty && prop && (
        <>
          <button
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition disabled:opacity-30"
            onClick={onBuild}
            disabled={!canBuild}
            title={canBuild ? 'Build house' : 'You must own the full color set to build'}
          >
            +Build
          </button>
          <button
            className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded transition disabled:opacity-30"
            onClick={onSell}
            disabled={prop.houses === 0 && !prop.isHotel}
            title="Sell building"
          >
            -Sell
          </button>
        </>
      )}

      {/* Mortgage / Unmortgage */}
      {!mortgaged ? (
        <button
          className="text-xs bg-red-600/80 hover:bg-red-700 text-white px-2 py-1 rounded transition"
          onClick={onMortgage}
          title={`Mortgage for $${tile.mortgageValue}`}
        >
          Mortgage
        </button>
      ) : (
        <button
          className="text-xs bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded transition"
          onClick={onUnmortgage}
          title={`Unmortgage for $${Math.ceil(tile.mortgageValue * 1.1)}`}
        >
          Unmortgage
        </button>
      )}
    </div>
  );
}
