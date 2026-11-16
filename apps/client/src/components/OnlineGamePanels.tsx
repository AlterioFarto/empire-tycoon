import { useState } from 'react';
import type {
  GameState,
  MonopolyCard,
  PropertyTile,
  RailroadTile,
  UtilityTile,
} from '@monopoly/shared';
import { AUCTION_MIN_RAISE } from '@monopoly/shared';
import { emitEvent } from '../hooks/useSocket.js';
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

type OwnableTile = PropertyTile | RailroadTile | UtilityTile;

function isOwnable(tile: { type: string }): tile is OwnableTile {
  return tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility';
}

function getOwnedTiles(game: GameState, playerId: string): OwnableTile[] {
  return game.tiles.filter(
    (tile): tile is OwnableTile => isOwnable(tile) && tile.ownerId === playerId,
  );
}

interface PanelProps {
  game: GameState;
  playerId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OnlinePropertyManager({ game, playerId, isOpen, onClose }: PanelProps) {
  const player = playerId ? game.players.find((p) => p.id === playerId) : null;
  if (!isOpen || !player) return null;

  const ownedTiles = getOwnedTiles(game, player.id);
  const propertyTiles = ownedTiles.filter((tile): tile is PropertyTile => tile.type === 'property');

  const grouped: Record<string, PropertyTile[]> = {};
  for (const property of propertyTiles) {
    if (!grouped[property.color]) grouped[property.color] = [];
    grouped[property.color]!.push(property);
  }

  function canBuildFor(property: PropertyTile): boolean {
    const group = game.tiles.filter(
      (tile): tile is PropertyTile => tile.type === 'property' && tile.color === property.color,
    );
    const ownsFullSet = group.every((tile) => tile.ownerId === player!.id);
    if (!ownsFullSet || property.isMortgaged || property.isHotel) return false;
    if (property.houses === 4) return game.hotelsRemaining > 0 && player!.money >= property.houseCost;
    if (property.houses < 4) return game.housesRemaining > 0 && player!.money >= property.houseCost;
    return false;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Properties" size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-400">
            {ownedTiles.length} propert{ownedTiles.length === 1 ? 'y' : 'ies'} owned
          </span>
          <span className="text-green-400 font-mono">${player.money}</span>
        </div>

        {ownedTiles.filter((tile) => tile.type !== 'property').length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Railroads &amp; Utilities
            </h4>
            <div className="space-y-1">
              {ownedTiles
                .filter((tile) => tile.type !== 'property')
                .map((tile) => (
                  <PropertyRow
                    key={tile.id}
                    tile={tile}
                    onBuild={() => {}}
                    onSell={() => {}}
                    onMortgage={() => emitEvent('game:mortgage', { propertyId: tile.id })}
                    onUnmortgage={() => emitEvent('game:unmortgage', { propertyId: tile.id })}
                  />
                ))}
            </div>
          </div>
        )}

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
                  onBuild={() => emitEvent('game:build-house', { propertyId: tile.id })}
                  onSell={() => emitEvent('game:sell-house', { propertyId: tile.id })}
                  onMortgage={() => emitEvent('game:mortgage', { propertyId: tile.id })}
                  onUnmortgage={() => emitEvent('game:unmortgage', { propertyId: tile.id })}
                />
              ))}
            </div>
          </div>
        ))}

        {ownedTiles.length === 0 && (
          <div className="text-gray-500 text-sm text-center py-8">
            You do not own any properties yet.
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-700 flex justify-end">
        <button
          className="text-gray-400 hover:text-white text-sm transition py-2 px-4"
          onClick={onClose}
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
  tile: OwnableTile;
  canBuild?: boolean;
  onBuild: () => void;
  onSell: () => void;
  onMortgage: () => void;
  onUnmortgage: () => void;
}) {
  const property = tile.type === 'property' ? tile : null;
  const mortgaged = tile.isMortgaged;

  return (
    <div
      className={`flex items-center gap-3 bg-gray-700/30 rounded-lg px-3 py-2 ${
        mortgaged ? 'opacity-60' : ''
      }`}
    >
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{
          backgroundColor: property ? COLOR_MAP[property.color] ?? '#6b7280' : '#6b7280',
        }}
      />

      <span className="text-sm text-white flex-1 truncate">{tile.name}</span>

      {property && (
        <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
          {property.isHotel ? (
            <span className="text-red-500 font-bold text-sm">HOTEL</span>
          ) : property.houses > 0 ? (
            <span className="text-green-500">{'🏠'.repeat(property.houses)}</span>
          ) : (
            <span>—</span>
          )}
        </span>
      )}

      {mortgaged && (
        <span className="text-xs text-red-400 font-medium whitespace-nowrap">Mortgaged</span>
      )}

      {!mortgaged && property && (
        <>
          <button
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition disabled:opacity-30"
            onClick={onBuild}
            disabled={!canBuild}
            title={
              canBuild
                ? property.houses === 4
                  ? 'Build hotel'
                  : 'Build house'
                : 'Must own full color group and have buildings available'
            }
          >
            {property.houses === 4 ? '+Hotel' : '+Build'}
          </button>
          <button
            className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded transition disabled:opacity-30"
            onClick={onSell}
            disabled={property.houses === 0 && !property.isHotel}
            title="Sell building"
          >
            -Sell
          </button>
        </>
      )}

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

export function OnlineTradePanel({ game, playerId, isOpen, onClose }: PanelProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [offerProps, setOfferProps] = useState<string[]>([]);
  const [offerMoney, setOfferMoney] = useState(0);
  const [requestProps, setRequestProps] = useState<string[]>([]);
  const [requestMoney, setRequestMoney] = useState(0);

  const player = playerId ? game.players.find((p) => p.id === playerId) : null;
  if (!isOpen || !player) return null;

  const otherPlayers = game.players.filter((p) => p.id !== player.id && !p.bankrupt);
  const partner = otherPlayers.find((p) => p.id === selectedPlayerId);
  const myTiles = getOwnedTiles(game, player.id).filter((tile) => !tile.isMortgaged);
  const partnerTiles = selectedPlayerId
    ? getOwnedTiles(game, selectedPlayerId).filter((tile) => !tile.isMortgaged)
    : [];
  const pendingTrade = game.tradeOffer;

  function resetForm() {
    setSelectedPlayerId('');
    setOfferProps([]);
    setOfferMoney(0);
    setRequestProps([]);
    setRequestMoney(0);
  }

  function toggleOfferProp(propId: string) {
    setOfferProps((prev) =>
      prev.includes(propId) ? prev.filter((id) => id !== propId) : [...prev, propId],
    );
  }

  function toggleRequestProp(propId: string) {
    setRequestProps((prev) =>
      prev.includes(propId) ? prev.filter((id) => id !== propId) : [...prev, propId],
    );
  }

  function handleSendTrade() {
    if (!selectedPlayerId) return;
    emitEvent('game:trade-offer', {
      offer: {
        fromPlayerId: player!.id,
        toPlayerId: selectedPlayerId,
        offerProperties: offerProps,
        offerMoney,
        requestProperties: requestProps,
        requestMoney,
      },
    });
    resetForm();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Trade" size="lg">
      {pendingTrade && pendingTrade.toPlayerId === player.id && (
        <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
          <div className="text-sm text-yellow-400 font-semibold mb-2">Incoming Trade Offer</div>
          <div className="text-xs text-gray-300 mb-2">
            From: {game.players.find((p) => p.id === pendingTrade.fromPlayerId)?.name ?? 'Player'}
          </div>
          <TradeSummary game={game} trade={pendingTrade} />
          <div className="flex gap-2">
            <button
              className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-1.5 px-4 rounded-lg transition"
              onClick={() => {
                emitEvent('game:trade-accept');
                onClose();
              }}
            >
              Accept
            </button>
            <button
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1.5 px-4 rounded-lg transition"
              onClick={() => {
                emitEvent('game:trade-reject');
                onClose();
              }}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {pendingTrade && pendingTrade.fromPlayerId === player.id && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
          <div className="text-sm text-blue-400 font-semibold mb-2">Trade Offer Sent</div>
          <div className="text-xs text-gray-300 mb-3">
            To: {game.players.find((p) => p.id === pendingTrade.toPlayerId)?.name ?? 'Player'} —
            Waiting for response...
          </div>
          <button
            className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold py-1.5 px-4 rounded-lg transition"
            onClick={() => {
              emitEvent('game:trade-cancel');
              resetForm();
            }}
          >
            Cancel Offer
          </button>
        </div>
      )}

      {pendingTrade && pendingTrade.fromPlayerId !== player.id && pendingTrade.toPlayerId !== player.id && (
        <div className="mb-4 p-3 bg-gray-900/40 border border-gray-700 rounded-lg text-xs text-gray-400">
          Another trade is pending between{' '}
          {game.players.find((p) => p.id === pendingTrade.fromPlayerId)?.name ?? 'a player'} and{' '}
          {game.players.find((p) => p.id === pendingTrade.toPlayerId)?.name ?? 'a player'}.
        </div>
      )}

      {!pendingTrade && (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
              Trade With
            </label>
            <div className="flex gap-2 flex-wrap">
              {otherPlayers.map((other) => (
                <button
                  key={other.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                    selectedPlayerId === other.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  onClick={() => setSelectedPlayerId(other.id)}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: other.color }}
                  />
                  {other.name}
                </button>
              ))}
              {otherPlayers.length === 0 && (
                <span className="text-sm text-gray-500">No other players</span>
              )}
            </div>
          </div>

          {selectedPlayerId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  You Offer
                </h4>
                <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
                  {myTiles.map((tile) => (
                    <TradePropertyRow
                      key={tile.id}
                      tile={tile}
                      selected={offerProps.includes(tile.id)}
                      onToggle={() => toggleOfferProp(tile.id)}
                      selectedClass="bg-green-600/20 border-green-600/50"
                    />
                  ))}
                  {myTiles.length === 0 && (
                    <span className="text-xs text-gray-500">No properties to trade</span>
                  )}
                </div>
                <label className="text-xs text-gray-400 mb-1 block">Money</label>
                <input
                  type="range"
                  min={0}
                  max={player.money}
                  step={10}
                  value={offerMoney}
                  onChange={(event) => setOfferMoney(Number(event.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-green-400 font-mono mt-1">${offerMoney}</div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  You Request
                </h4>
                <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
                  {partnerTiles.map((tile) => (
                    <TradePropertyRow
                      key={tile.id}
                      tile={tile}
                      selected={requestProps.includes(tile.id)}
                      onToggle={() => toggleRequestProp(tile.id)}
                      selectedClass="bg-yellow-600/20 border-yellow-600/50"
                    />
                  ))}
                  {partnerTiles.length === 0 && (
                    <span className="text-xs text-gray-500">No properties available</span>
                  )}
                </div>
                <label className="text-xs text-gray-400 mb-1 block">Money</label>
                <input
                  type="range"
                  min={0}
                  max={partner?.money ?? 0}
                  step={10}
                  value={requestMoney}
                  onChange={(event) => setRequestMoney(Number(event.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-yellow-400 font-mono mt-1">${requestMoney}</div>
              </div>
            </div>
          )}

          {selectedPlayerId && (
            <div className="mt-4 flex justify-end">
              <button
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-40"
                onClick={handleSendTrade}
                disabled={
                  offerProps.length === 0 &&
                  offerMoney === 0 &&
                  requestProps.length === 0 &&
                  requestMoney === 0
                }
              >
                Send Offer
              </button>
            </div>
          )}
        </>
      )}

      <div className="mt-4 pt-3 border-t border-gray-700 flex justify-end">
        <button
          className="text-gray-400 hover:text-white text-sm transition py-2 px-4"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

function TradePropertyRow({
  tile,
  selected,
  onToggle,
  selectedClass,
}: {
  tile: OwnableTile;
  selected: boolean;
  onToggle: () => void;
  selectedClass: string;
}) {
  return (
    <label
      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition ${
        selected
          ? `border ${selectedClass}`
          : 'bg-gray-700/30 border border-transparent hover:bg-gray-700/50'
      }`}
    >
      <input
        type="checkbox"
        className="rounded bg-gray-600 border-gray-500"
        checked={selected}
        onChange={onToggle}
      />
      {tile.type === 'property' && (
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: COLOR_MAP[tile.color] ?? '#6b7280' }}
        />
      )}
      <span className="text-xs text-white truncate">{tile.name}</span>
    </label>
  );
}

function TradeSummary({
  game,
  trade,
}: {
  game: GameState;
  trade: NonNullable<GameState['tradeOffer']>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 mb-3 bg-gray-900/40 rounded p-2">
      <div>
        <div className="text-[10px] text-green-400 font-semibold uppercase mb-1">They Offer</div>
        {trade.offerProperties.length > 0 ? (
          <div className="space-y-0.5">
            {trade.offerProperties.map((propertyId) => {
              const tile = game.tiles.find((t) => t.id === propertyId);
              return (
                <div key={propertyId} className="flex items-center gap-1 text-[11px] text-gray-200">
                  {tile?.type === 'property' && (
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLOR_MAP[tile.color] ?? '#666' }}
                    />
                  )}
                  {tile?.name ?? propertyId}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-[11px] text-gray-500 italic">No properties</div>
        )}
        {trade.offerMoney > 0 && (
          <div className="text-[11px] text-green-300 font-mono mt-1">+ ${trade.offerMoney}</div>
        )}
      </div>
      <div>
        <div className="text-[10px] text-yellow-400 font-semibold uppercase mb-1">They Request</div>
        {trade.requestProperties.length > 0 ? (
          <div className="space-y-0.5">
            {trade.requestProperties.map((propertyId) => {
              const tile = game.tiles.find((t) => t.id === propertyId);
              return (
                <div key={propertyId} className="flex items-center gap-1 text-[11px] text-gray-200">
                  {tile?.type === 'property' && (
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLOR_MAP[tile.color] ?? '#666' }}
                    />
                  )}
                  {tile?.name ?? propertyId}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-[11px] text-gray-500 italic">No properties</div>
        )}
        {trade.requestMoney > 0 && (
          <div className="text-[11px] text-yellow-300 font-mono mt-1">+ ${trade.requestMoney}</div>
        )}
      </div>
    </div>
  );
}

const CARD_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  chance: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  'community-chest': { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3' },
};

const CARD_ICONS: Record<string, string> = {
  chance: '?',
  'community-chest': '✉',
};

export function OnlineCardModal({
  card,
  onClose,
}: {
  card: MonopolyCard | null;
  onClose: () => void;
}) {
  if (!card) return null;

  const colors = CARD_COLORS[card.type] ?? { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3' };
  const icon = CARD_ICONS[card.type] ?? '?';
  const isPayment = card.action.includes('pay');

  return (
    <Modal isOpen onClose={onClose} size="sm">
      <div className="text-center">
        <div
          className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
          style={{ backgroundColor: colors.bg, border: `3px solid ${colors.border}` }}
        >
          <span className="text-3xl font-black" style={{ color: colors.border }}>
            {icon}
          </span>
        </div>

        <div
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: colors.border }}
        >
          {card.type === 'chance' ? 'Chance Card' : 'Community Chest'}
        </div>

        <h3 className="text-xl font-bold text-white mb-3">{card.title}</h3>

        <p className="text-sm text-gray-300 leading-relaxed mb-4">{card.description}</p>

        {card.value !== undefined && card.value !== null && (
          <div className="mb-4">
            <span className={`text-lg font-bold ${isPayment ? 'text-red-400' : 'text-green-400'}`}>
              {isPayment ? '-' : '+'}${card.value}
            </span>
          </div>
        )}

        {card.action === 'go-to-jail' && (
          <div className="text-lg font-bold text-red-400 mb-4">Go to Jail!</div>
        )}
        {card.action === 'advance-to-go' && (
          <div className="text-lg font-bold text-green-400 mb-4">Advance to GO — Collect $200</div>
        )}
        {card.action === 'get-out-of-jail-free' && (
          <div className="text-lg font-bold text-yellow-400 mb-4">Get Out of Jail Free</div>
        )}

        <button
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-8 rounded-lg transition"
          onClick={onClose}
        >
          OK
        </button>
      </div>
    </Modal>
  );
}

export function OnlineAuctionPanel({
  game,
  playerId,
}: {
  game: GameState;
  playerId: string | null;
}) {
  const [bid, setBid] = useState('');
  const auction = game.auction;
  if (!auction || !auction.active) return null;

  const property = game.tiles.find((tile) => tile.id === auction.propertyId);
  const bidderName = auction.currentBidderId
    ? game.players.find((p) => p.id === auction.currentBidderId)?.name ?? 'Unknown'
    : null;
  const player = playerId ? game.players.find((p) => p.id === playerId) : null;
  const isParticipant = Boolean(playerId && auction.bidders.includes(playerId));
  const minimumBid = auction.currentBid + AUCTION_MIN_RAISE;
  const parsedBid = Number(bid);
  const canBid =
    isParticipant &&
    Boolean(player) &&
    Number.isInteger(parsedBid) &&
    parsedBid >= minimumBid &&
    parsedBid <= (player?.money ?? 0);

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-yellow-700/50">
      <div className="flex items-center gap-2 text-yellow-400 text-sm font-semibold mb-2">
        <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
        Auction: {property?.name ?? auction.propertyId}
      </div>
      <div className="text-xs text-gray-400 mb-3">
        Current bid: <span className="text-white font-mono">${auction.currentBid}</span>
        {bidderName ? ` by ${bidderName}` : ' (no bids yet)'} · Minimum raise: ${minimumBid}
      </div>

      {isParticipant ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={minimumBid}
            max={player?.money ?? 0}
            value={bid}
            onChange={(event) => setBid(event.target.value)}
            placeholder={`${minimumBid}`}
            className="w-28 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
          />
          <button
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition disabled:opacity-40"
            onClick={() => {
              emitEvent('game:auction-bid', { amount: parsedBid });
              setBid('');
            }}
            disabled={!canBid}
          >
            Bid
          </button>
          <button
            className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition"
            onClick={() => emitEvent('game:pass-auction')}
          >
            Pass
          </button>
        </div>
      ) : (
        <div className="text-sm text-gray-400 italic">Waiting for auction to finish...</div>
      )}
    </div>
  );
}
