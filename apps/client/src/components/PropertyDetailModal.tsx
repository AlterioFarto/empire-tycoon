import type { Tile, PropertyTile, RailroadTile, UtilityTile } from '@monopoly/shared';
import { useLocalGameStore } from '../store/localGameStore.js';
import { Modal } from './Modal.js';

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

const COLOR_LABELS: Record<string, string> = {
  brown: 'Brown',
  'light-blue': 'Light Blue',
  pink: 'Pink',
  orange: 'Orange',
  red: 'Red',
  yellow: 'Yellow',
  green: 'Green',
  'dark-blue': 'Dark Blue',
};

export function PropertyDetailModal() {
  const isOpen = useLocalGameStore((s) => s.activeModal === 'property-detail');
  const modalData = useLocalGameStore((s) => s.modalData);
  const closeModal = useLocalGameStore((s) => s.closeModal);
  const game = useLocalGameStore((s) => s.game);
  const currentTurn = useLocalGameStore((s) => s.game?.currentTurn);
  const buyProperty = useLocalGameStore((s) => s.buyProperty);
  const buildHouse = useLocalGameStore((s) => s.buildHouse);
  const sellHouse = useLocalGameStore((s) => s.sellHouse);
  const mortgage = useLocalGameStore((s) => s.mortgage);
  const unmortgage = useLocalGameStore((s) => s.unmortgage);

  if (!isOpen || !game) return null;

  const tileId = modalData.tileId as string | undefined;
  const tile = game.tiles.find((t) => t.id === tileId);
  if (!tile) return null;

  const currentPlayer = currentTurn
    ? game.players.find((p) => p.id === currentTurn.playerId)
    : null;

  const owner = hasOwner(tile)
    ? game.players.find((p) => p.id === (tile as PropertyTile | RailroadTile | UtilityTile).ownerId)
    : null;

  const isCurrentPlayerOwner =
    owner && currentPlayer && owner.id === currentPlayer.id;

  // Whether the current player owns the full color set (required to build).
  const isProperty = tile.type === 'property';
  const groupProps = isProperty
    ? (game.tiles.filter(
        (t) => t.type === 'property' && (t as PropertyTile).color === (tile as PropertyTile).color,
      ) as PropertyTile[])
    : [];
  const ownsFullSet = isProperty && currentPlayer
    ? groupProps.every((p) => p.ownerId === currentPlayer.id)
    : false;

  const canBuy =
    !owner &&
    currentPlayer &&
    currentTurn?.phase === 'deciding-buy' &&
    currentPlayer.money >= getPrice(tile);

  // Build is only allowed when the full color set is owned (and not maxed/mortgaged).
  const propTile = tile as PropertyTile;
  const canBuildSet =
    isCurrentPlayerOwner &&
    ownsFullSet &&
    !propTile.isMortgaged &&
    !propTile.isHotel &&
    propTile.houses < 4;

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title={tile.name} size="md">
      {/* Color bar for properties */}
      {tile.type === 'property' && (
        <div
          className="h-3 -mx-5 -mt-4 mb-4 rounded-t"
          style={{ backgroundColor: COLOR_MAP[(tile as PropertyTile).color] ?? '#6b7280' }}
        />
      )}

      {/* Type badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {getTypeLabel(tile)}
        </span>
        {tile.type === 'property' && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded"
            style={{
              backgroundColor: COLOR_MAP[(tile as PropertyTile).color] + '33',
              color: COLOR_MAP[(tile as PropertyTile).color],
            }}
          >
            {COLOR_LABELS[(tile as PropertyTile).color]}
          </span>
        )}
      </div>

      {/* Rent table for properties */}
      {tile.type === 'property' && <PropertyRentTable tile={tile as PropertyTile} />}

      {/* Railroad rent info */}
      {tile.type === 'railroad' && <RailroadRentInfo tile={tile as RailroadTile} />}

      {/* Utility info */}
      {tile.type === 'utility' && (
        <div className="text-sm text-gray-300 mb-4">
          Rent is 4x dice roll if owner has 1 utility, 10x if owner has both.
        </div>
      )}

      {/* Owner info */}
      <div className="flex items-center justify-between py-3 border-t border-gray-700">
        <span className="text-sm text-gray-400">Owner</span>
        {owner ? (
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: owner.color }}
            />
            <span className="text-sm font-medium text-white">{owner.name}</span>
            {isCurrentPlayerOwner && (
              <span className="text-xs text-gray-400">(You)</span>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-500">Unowned</span>
        )}
      </div>

      {/* Buildings info */}
      {tile.type === 'property' && isCurrentPlayerOwner && (
        <div className="flex items-center justify-between py-3 border-t border-gray-700">
          <span className="text-sm text-gray-400">Buildings</span>
          <span className="text-sm font-medium text-white">
            {(tile as PropertyTile).isHotel
              ? 'Hotel'
              : (tile as PropertyTile).houses > 0
                ? `${(tile as PropertyTile).houses} House${(tile as PropertyTile).houses > 1 ? 's' : ''}`
                : 'None'}
          </span>
        </div>
      )}

      {/* Mortgage info */}
      {(tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility') && (
        <div className="flex items-center justify-between py-3 border-t border-gray-700">
          <span className="text-sm text-gray-400">Mortgage Value</span>
          <span className="text-sm font-medium text-white">
            ${(tile as PropertyTile | RailroadTile | UtilityTile).mortgageValue}
            {(tile as PropertyTile | RailroadTile | UtilityTile).isMortgaged && (
              <span className="text-red-400 ml-2">(Mortgaged)</span>
            )}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-700">
        {canBuy && (
          <button
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
            onClick={() => {
              buyProperty();
              closeModal();
            }}
          >
            Buy ${getPrice(tile)}
          </button>
        )}

        {isCurrentPlayerOwner && tile.type === 'property' && (
          <>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-40"
              onClick={() => {
                buildHouse(tile.id);
                closeModal();
              }}
              disabled={!canBuildSet}
              title={
                !ownsFullSet
                  ? 'You must own the full color set to build'
                  : 'Build a house'
              }
            >
              Build House
            </button>
            <button
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-40"
              onClick={() => {
                sellHouse(tile.id);
                closeModal();
              }}
              disabled={(tile as PropertyTile).houses === 0 && !(tile as PropertyTile).isHotel}
            >
              Sell Building
            </button>
          </>
        )}

        {isCurrentPlayerOwner && (
          <>
            {!(tile as PropertyTile | RailroadTile | UtilityTile).isMortgaged ? (
              <button
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                onClick={() => {
                  mortgage(tile.id);
                  closeModal();
                }}
              >
                Mortgage
              </button>
            ) : (
              <button
                className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-40"
                onClick={() => {
                  unmortgage(tile.id);
                  closeModal();
                }}
                disabled={
                  !currentPlayer ||
                  currentPlayer.money <
                    Math.ceil((tile as PropertyTile | RailroadTile | UtilityTile).mortgageValue * 1.1)
                }
              >
                Unmortgage
              </button>
            )}
          </>
        )}

        <button
          className="ml-auto text-gray-400 hover:text-white text-sm transition py-2 px-4"
          onClick={closeModal}
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

function PropertyRentTable({ tile }: { tile: PropertyTile }) {
  const rows = [
    { label: 'Base Rent', value: tile.rent },
    { label: '1 House', value: tile.rentWithOneHouse },
    { label: '2 Houses', value: tile.rentWithTwoHouses },
    { label: '3 Houses', value: tile.rentWithThreeHouses },
    { label: '4 Houses', value: tile.rentWithFourHouses },
    { label: 'Hotel', value: tile.rentWithHotel },
  ];

  return (
    <div className="mb-4">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Rent Schedule</h4>
      <div className="grid grid-cols-2 gap-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between bg-gray-700/50 rounded px-3 py-1.5"
          >
            <span className="text-xs text-gray-400">{row.label}</span>
            <span className="text-xs font-medium text-green-400">${row.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-500">House cost: ${tile.houseCost}</div>
    </div>
  );
}

function RailroadRentInfo({ tile }: { tile: RailroadTile }) {
  return (
    <div className="mb-4">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Rent Schedule</h4>
      <div className="grid grid-cols-2 gap-1">
        {tile.rent.map((rent, i) => (
          <div
            key={i}
            className="flex items-center justify-between bg-gray-700/50 rounded px-3 py-1.5"
          >
            <span className="text-xs text-gray-400">{i + 1} Railroad{i > 0 ? 's' : ''}</span>
            <span className="text-xs font-medium text-green-400">${rent}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function hasOwner(tile: Tile): tile is PropertyTile | RailroadTile | UtilityTile {
  return tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility';
}

function getPrice(tile: Tile): number {
  if (tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility') {
    return (tile as PropertyTile | RailroadTile | UtilityTile).price;
  }
  return 0;
}

function getTypeLabel(tile: Tile): string {
  switch (tile.type) {
    case 'property':
      return 'Property';
    case 'railroad':
      return 'Railroad';
    case 'utility':
      return 'Utility';
    default:
      return tile.type;
  }
}
