import { useState } from 'react';
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

export function TradePanel() {
  const isOpen = useLocalGameStore((s) => s.activeModal === 'trade');
  const closeModal = useLocalGameStore((s) => s.closeModal);
  const game = useLocalGameStore((s) => s.game);
  const currentTurn = useLocalGameStore((s) => s.game?.currentTurn);
  const createTrade = useLocalGameStore((s) => s.createTrade);
  const acceptTrade = useLocalGameStore((s) => s.acceptTrade);
  const rejectTrade = useLocalGameStore((s) => s.rejectTrade);
  const cancelTrade = useLocalGameStore((s) => s.cancelTrade);

  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [offerProps, setOfferProps] = useState<string[]>([]);
  const [offerMoney, setOfferMoney] = useState(0);
  const [requestProps, setRequestProps] = useState<string[]>([]);
  const [requestMoney, setRequestMoney] = useState(0);

  if (!isOpen || !game || !currentTurn) return null;

  const currentPlayer = game.players.find((p) => p.id === currentTurn.playerId);
  const otherPlayers = game.players.filter(
    (p) => p.id !== currentPlayer?.id && !p.bankrupt,
  );

  const pendingTrade = game.tradeOffer;

  // Get current player's ownable tiles
  const myTiles = game.tiles.filter(
    (t) =>
      (t.type === 'property' || t.type === 'railroad' || t.type === 'utility') &&
      (t as PropertyTile | RailroadTile | UtilityTile).ownerId === currentPlayer?.id &&
      !(t as PropertyTile | RailroadTile | UtilityTile).isMortgaged,
  ) as (PropertyTile | RailroadTile | UtilityTile)[];

  // Get selected trade partner's ownable tiles
  const partnerPlayer = otherPlayers.find((p) => p.id === selectedPlayerId);
  const partnerTiles = game.tiles.filter(
    (t) =>
      (t.type === 'property' || t.type === 'railroad' || t.type === 'utility') &&
      (t as PropertyTile | RailroadTile | UtilityTile).ownerId === selectedPlayerId &&
      !(t as PropertyTile | RailroadTile | UtilityTile).isMortgaged,
  ) as (PropertyTile | RailroadTile | UtilityTile)[];

  function handleSendTrade() {
    if (!selectedPlayerId || !currentPlayer) return;
    createTrade(selectedPlayerId, offerProps, offerMoney, requestProps, requestMoney);
    resetForm();
  }

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

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="Trade" size="lg">
      {/* Pending incoming trade offer */}
      {pendingTrade && pendingTrade.toPlayerId === currentPlayer?.id && (
        <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
          <div className="text-sm text-yellow-400 font-semibold mb-2">Incoming Trade Offer</div>
          <div className="text-xs text-gray-300 mb-3">
            From: {game.players.find((p) => p.id === pendingTrade.fromPlayerId)?.name}
          </div>
          <div className="flex gap-2">
            <button
              className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-1.5 px-4 rounded-lg transition"
              onClick={() => {
                acceptTrade();
                closeModal();
              }}
            >
              Accept
            </button>
            <button
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1.5 px-4 rounded-lg transition"
              onClick={() => {
                rejectTrade();
                closeModal();
              }}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Pending outgoing trade offer */}
      {pendingTrade && pendingTrade.fromPlayerId === currentPlayer?.id && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
          <div className="text-sm text-blue-400 font-semibold mb-2">Trade Offer Sent</div>
          <div className="text-xs text-gray-300 mb-3">
            To: {game.players.find((p) => p.id === pendingTrade.toPlayerId)?.name} — Waiting for response...
          </div>
          <button
            className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold py-1.5 px-4 rounded-lg transition"
            onClick={() => {
              cancelTrade();
              resetForm();
            }}
          >
            Cancel Offer
          </button>
        </div>
      )}

      {/* New trade form */}
      {!pendingTrade && (
        <>
          {/* Trade partner selector */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
              Trade With
            </label>
            <div className="flex gap-2 flex-wrap">
              {otherPlayers.map((p) => (
                <button
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                    selectedPlayerId === p.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  onClick={() => setSelectedPlayerId(p.id)}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                </button>
              ))}
              {otherPlayers.length === 0 && (
                <span className="text-sm text-gray-500">No other players</span>
              )}
            </div>
          </div>

          {selectedPlayerId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Your offer */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  You Offer
                </h4>

                {/* Properties */}
                <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
                  {myTiles.map((tile) => (
                    <label
                      key={tile.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition ${
                        offerProps.includes(tile.id)
                          ? 'bg-green-600/20 border border-green-600/50'
                          : 'bg-gray-700/30 border border-transparent hover:bg-gray-700/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="rounded bg-gray-600 border-gray-500"
                        checked={offerProps.includes(tile.id)}
                        onChange={() => toggleOfferProp(tile.id)}
                      />
                      {tile.type === 'property' && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COLOR_MAP[(tile as PropertyTile).color] }}
                        />
                      )}
                      <span className="text-xs text-white truncate">{tile.name}</span>
                    </label>
                  ))}
                  {myTiles.length === 0 && (
                    <span className="text-xs text-gray-500">No properties to trade</span>
                  )}
                </div>

                {/* Money */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Money</label>
                  <input
                    type="range"
                    min={0}
                    max={currentPlayer?.money ?? 0}
                    step={10}
                    value={offerMoney}
                    onChange={(e) => setOfferMoney(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-green-400 font-mono mt-1">${offerMoney}</div>
                </div>
              </div>

              {/* Your request */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  You Request
                </h4>

                {/* Properties */}
                <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
                  {partnerTiles.map((tile) => (
                    <label
                      key={tile.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition ${
                        requestProps.includes(tile.id)
                          ? 'bg-yellow-600/20 border border-yellow-600/50'
                          : 'bg-gray-700/30 border border-transparent hover:bg-gray-700/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="rounded bg-gray-600 border-gray-500"
                        checked={requestProps.includes(tile.id)}
                        onChange={() => toggleRequestProp(tile.id)}
                      />
                      {tile.type === 'property' && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COLOR_MAP[(tile as PropertyTile).color] }}
                        />
                      )}
                      <span className="text-xs text-white truncate">{tile.name}</span>
                    </label>
                  ))}
                  {partnerTiles.length === 0 && (
                    <span className="text-xs text-gray-500">No properties available</span>
                  )}
                </div>

                {/* Money */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Money</label>
                  <input
                    type="range"
                    min={0}
                    max={partnerPlayer?.money ?? 0}
                    step={10}
                    value={requestMoney}
                    onChange={(e) => setRequestMoney(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-yellow-400 font-mono mt-1">${requestMoney}</div>
                </div>
              </div>
            </div>
          )}

          {/* Send button */}
          {selectedPlayerId && (
            <div className="mt-4 flex justify-end">
              <button
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-40"
                onClick={handleSendTrade}
                disabled={offerProps.length === 0 && offerMoney === 0 && requestProps.length === 0 && requestMoney === 0}
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
          onClick={closeModal}
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
