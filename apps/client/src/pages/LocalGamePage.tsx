import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalGameStore } from '../store/localGameStore.js';
import { Board } from '../components/Board.js';
import { PlayerList } from '../components/PlayerList.js';
import { DiceRollDisplay } from '../components/DiceRoll.js';
import { PropertyDetailModal } from '../components/PropertyDetailModal.js';
import { CardModal } from '../components/CardModal.js';
import { InfoPopup } from '../components/InfoPopup.js';
import { GameLogModal } from '../components/GameLogModal.js';
import { PropertyManager } from '../components/PropertyManager.js';
import { TradePanel } from '../components/TradePanel.js';
import { SettingsModal } from '../components/SettingsModal.js';

export function LocalGamePage() {
  const navigate = useNavigate();
  const game = useLocalGameStore((s) => s.game);
  const phase = useLocalGameStore((s) => s.phase);
  const lastRoll = useLocalGameStore((s) => s.lastRoll);
  const lastDrawnCard = useLocalGameStore((s) => s.lastDrawnCard);
  const activeModal = useLocalGameStore((s) => s.activeModal);
  const animation = useLocalGameStore((s) => s.animation);

  const rollDice = useLocalGameStore((s) => s.rollDice);
  const buyProperty = useLocalGameStore((s) => s.buyProperty);
  const payTaxFlat = useLocalGameStore((s) => s.payTaxFlat);
  const payTaxPercentage = useLocalGameStore((s) => s.payTaxPercentage);
  const passAuction = useLocalGameStore((s) => s.passAuction);
  const payJailFine = useLocalGameStore((s) => s.payJailFine);
  const useJailCard = useLocalGameStore((s) => s.useJailCard);
  const rollForJail = useLocalGameStore((s) => s.rollForJail);
  const endTurn = useLocalGameStore((s) => s.endTurn);
  const reset = useLocalGameStore((s) => s.reset);
  const openModal = useLocalGameStore((s) => s.openModal);

  // Redirect to setup if no game
  useEffect(() => {
    if (phase === 'setup' || !game) {
      navigate('/local/setup', { replace: true });
    }
  }, [phase, game, navigate]);

  // Auto-open card modal when a card is drawn
  useEffect(() => {
    if (lastDrawnCard && activeModal !== 'card') {
      openModal('card');
    }
  }, [lastDrawnCard]);

  if (!game) return null;

  const currentTurn = game.currentTurn;
  const currentPlayer = currentTurn
    ? game.players.find((p) => p.id === currentTurn.playerId)
    : null;
  const currentPhase = currentTurn?.phase;
  const canRoll = currentPhase === 'waiting-to-roll' && !animation.isRolling && !animation.isMoving;
  const canEndTurn = currentPhase === 'optional-actions' || currentPhase === 'end-turn';
  const isDecidingBuy = currentPhase === 'deciding-buy';
  const isDecidingTax = currentPhase === 'deciding-tax';
  const isJailOptions = currentPhase === 'jail-options';
  const gameOver = !!game.winnerId;
  const isAnimating = animation.isRolling || animation.isMoving;

  function handleRoll() {
    rollDice();
  }

  function handleEndTurnClick() {
    endTurn();
  }

  function handleLeave() {
    reset();
    navigate('/', { replace: true });
  }

  function handleTileClick(_tileId: string, tileIndex: number) {
    openModal('property-detail', { tileIndex });
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Winner banner */}
      {game.winnerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-800 rounded-2xl p-10 text-center shadow-2xl">
            <div className="text-4xl mb-2">🏆</div>
            <h2 className="text-3xl font-bold text-yellow-400 mb-2">
              {game.players.find((p) => p.id === game.winnerId)?.name} Wins!
            </h2>
            <button
              className="mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-8 rounded-lg transition"
              onClick={handleLeave}
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* Fixed top bar */}
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-3 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: currentPlayer?.color ?? 'gray' }}
            />
            <div>
              <div className="text-[10px] text-gray-400 leading-none">Current Turn</div>
              <div className="text-lg font-bold leading-tight">{currentPlayer?.name ?? '—'}</div>
            </div>
          </div>

          <div className="text-center hidden sm:block">
            <div className="text-[10px] text-gray-400 leading-none">Phase</div>
            <div className="text-xs font-medium text-yellow-400">{currentPhase}</div>
          </div>

          <div className="flex items-center gap-2">
            {/* Settings */}
            <button
              className="text-gray-400 hover:text-white text-xs transition px-2 py-1.5 rounded hover:bg-gray-700"
              onClick={() => openModal('settings')}
            >
              ⚙️
            </button>
            {/* Log button */}
            <button
              className="text-gray-400 hover:text-white text-xs transition px-2 py-1.5 rounded hover:bg-gray-700"
              onClick={() => openModal('game-log')}
            >
              📋 Log
            </button>
            <button
              className="text-gray-500 hover:text-white text-xs transition px-2 py-1.5 rounded hover:bg-gray-700"
              onClick={handleLeave}
            >
              Leave
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 p-4">
          {/* Main area */}
          <div className="space-y-4">
            {/* Board */}
            <div className="flex justify-center">
              <Board
                tiles={game.tiles}
                players={game.players}
                currentPlayerId={currentTurn?.playerId ?? null}
                onTileClick={handleTileClick}
                animation={animation}
              />
            </div>

            {/* Hot-seat pass notification */}
            {currentTurn && !canRoll && !isJailOptions && currentPhase !== 'deciding-buy' && !isAnimating && (
              <div className="bg-gray-800 rounded-lg p-3 text-center text-sm text-yellow-400">
                Pass to <strong>{currentPlayer?.name}</strong>
              </div>
            )}

            {/* Animating indicator */}
            {isAnimating && (
              <div className="bg-gray-800 rounded-lg p-3 text-center text-sm text-yellow-400 animate-pulse">
                {animation.isRolling ? 'Rolling dice...' : 'Moving...'}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <PlayerList
                players={game.players}
                currentTurn={currentTurn}
                playerId={null}
              />
            </div>

            {/* Mini game log in sidebar */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Game Log</h3>
                <button
                  className="text-xs text-green-400 hover:text-green-300 transition"
                  onClick={() => openModal('game-log')}
                >
                  View All
                </button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {game.logs.slice(-15).reverse().map((log) => (
                  <div key={log.id} className="text-xs text-gray-400">
                    {log.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom action bar */}
      {!gameOver && (
        <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 px-4 py-3 z-10">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
            {/* Dice + Roll */}
            <DiceRollDisplay
              roll={lastRoll}
              rolling={animation.isRolling}
              onRoll={handleRoll}
              canRoll={canRoll}
              phase={currentPhase ?? ''}
            />

            {/* Income Tax choice */}
            {isDecidingTax && (
              <>
                <button
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                  onClick={payTaxFlat}
                >
                  Pay $200 Flat
                </button>
                <button
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                  onClick={payTaxPercentage}
                >
                  Pay 10% (${Math.floor((currentPlayer?.money ?? 0) * 0.1)})
                </button>
              </>
            )}

            {/* Buy / Pass buttons */}
            {isDecidingBuy && (
              <>
                <button
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                  onClick={buyProperty}
                >
                  Buy Property
                </button>
                <button
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                  onClick={passAuction}
                >
                  Pass on Property
                </button>
              </>
            )}

            {/* Jail options */}
            {isJailOptions && (
              <>
                <button
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                  onClick={payJailFine}
                >
                  Pay $50 Fine
                </button>
                <button
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                  onClick={useJailCard}
                  disabled={(currentPlayer?.getOutOfJailCards ?? 0) <= 0}
                >
                  Use Jail Card
                </button>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                  onClick={rollForJail}
                >
                  Roll for Doubles
                </button>
              </>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Manage Properties + Trade — always visible */}
            <button
              className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition text-sm flex items-center gap-2"
              onClick={() => openModal('manage-properties')}
            >
              🏠 Manage
            </button>
            <div className="relative">
              <button
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition text-sm flex items-center gap-2"
                onClick={() => openModal('trade')}
              >
                🔄 Trade
              </button>
              {game.tradeOffer && game.tradeOffer.toPlayerId === currentTurn?.playerId && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-pulse shadow-lg">
                  1
                </div>
              )}
            </div>

            {/* End Turn */}
            {canEndTurn && (
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-lg transition text-sm"
                onClick={handleEndTurnClick}
              >
                End Turn
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <PropertyDetailModal />
      <CardModal />
      <InfoPopup />
      <GameLogModal />
      <PropertyManager />
      <TradePanel />
      <SettingsModal />
    </div>
  );
}
