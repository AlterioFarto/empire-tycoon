import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useGameStore } from '../store/gameStore.js';
import { useSocket, emitEvent } from '../hooks/useSocket.js';
import { Board } from '../components/Board.js';
import { PlayerList } from '../components/PlayerList.js';
import { DiceRollDisplay } from '../components/DiceRoll.js';
import { Chat } from '../components/Chat.js';

export function GamePage() {
  useParams<{ id: string }>();
  useSocket();

  const game = useGameStore((s) => s.game);
  const playerId = useGameStore((s) => s.playerId);
  const lastRoll = useGameStore((s) => s.lastRoll);
  const error = useGameStore((s) => s.error);
  const setLastRoll = useGameStore((s) => s.setLastRoll);

  // Clear dice display when turn changes (avoids showing previous player's roll)
  useEffect(() => {
    setLastRoll(null);
  }, [game?.currentTurn?.playerId, setLastRoll]);

  useEffect(() => {
    if (!game) return;
    if (game.winnerId) {
      const winner = game.players.find((p) => p.id === game.winnerId);
      if (winner) {
        // Show win message
      }
    }
  }, [game?.winnerId]);

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400 text-xl">Loading game...</div>
      </div>
    );
  }

  const gameCurrentTurn = game.currentTurn;
  const currentPlayer = gameCurrentTurn
    ? game.players.find((p) => p.id === gameCurrentTurn.playerId)
    : null;
  const isMyTurn = currentPlayer?.id === playerId;
  const currentPhase = gameCurrentTurn?.phase;
  const canRoll = isMyTurn && currentPhase === 'waiting-to-roll';
  const canEndTurn = isMyTurn && (currentPhase === 'optional-actions' || currentPhase === 'end-turn');

  function handleRollDice() {
    emitEvent('game:roll-dice', {});
  }

  function handleBuyProperty() {
    emitEvent('game:buy-property', {});
  }

  function handleEndTurn() {
    emitEvent('game:end-turn', {});
  }

  function handlePayJail() {
    emitEvent('game:pay-jail-fine', {});
  }

  function handleUseJailCard() {
    emitEvent('game:use-jail-card', {});
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-900/80 text-red-200 px-6 py-3 rounded-lg z-50 border border-red-700">
          {error}
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        {/* Main game area */}
        <div className="space-y-4">
          {/* Top bar */}
          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4">
            <div>
              <div className="text-sm text-gray-400">Current Turn</div>
              <div className="text-lg font-semibold">{currentPlayer?.name ?? 'N/A'}</div>
            </div>
            <div className="text-sm text-gray-400">
              Phase: <span className="text-yellow-400 font-medium">{game.currentTurn?.phase ?? 'N/A'}</span>
            </div>
            {game.settings.freeParkingJackpot && game.freeParkingMoney > 0 && (
              <div className="text-sm text-green-400">
                Free Parking: ${game.freeParkingMoney}
              </div>
            )}
          </div>

          {/* Board */}
          <div className="flex justify-center">
            <Board
              tiles={game.tiles}
              players={game.players}
              currentPlayerId={game.currentTurn?.playerId ?? null}
            />
          </div>

          {/* Action bar */}
          <div className="bg-gray-800 rounded-lg p-4 flex flex-wrap items-center gap-4">
            <DiceRollDisplay
              roll={lastRoll}
              rolling={false}
              onRoll={handleRollDice}
              canRoll={canRoll}
              phase={game.currentTurn?.phase ?? ''}
            />

            {isMyTurn && game.currentTurn?.phase === 'deciding-buy' && (
              <>
                <button
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  onClick={handleBuyProperty}
                >
                  Buy Property
                </button>
                <button
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  onClick={() => emitEvent('game:pass-auction', {})}
                >
                  Auction
                </button>
              </>
            )}

            {isMyTurn && game.currentTurn?.phase === 'jail-options' && (
              <>
                <button
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  onClick={handlePayJail}
                >
                  Pay $50 Fine
                </button>
                <button
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  onClick={handleUseJailCard}
                >
                  Use Jail Card
                </button>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  onClick={handleRollDice}
                >
                  Roll for Doubles
                </button>
              </>
            )}

            {canEndTurn && (
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition ml-auto"
                onClick={handleEndTurn}
              >
                End Turn
              </button>
            )}

            {!isMyTurn && (
              <div className="text-gray-400 italic">
                Waiting for {currentPlayer?.name ?? 'current player'}...
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <PlayerList
              players={game.players}
              currentTurn={game.currentTurn}
              playerId={playerId}
            />
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <Chat />
          </div>

          {/* Game log */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Game Log</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {game.logs.slice(-20).reverse().map((log) => (
                <div key={log.id} className="text-xs text-gray-400">
                  {log.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
