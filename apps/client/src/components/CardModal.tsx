import { useLocalGameStore } from '../store/localGameStore.js';
import { Modal } from './Modal.js';

const CARD_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  chance: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  'community-chest': { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3' },
};

const CARD_ICONS: Record<string, string> = {
  chance: '?',
  'community-chest': '✉',
};

export function CardModal() {
  const isOpen = useLocalGameStore((s) => s.activeModal === 'card');
  const lastDrawnCard = useLocalGameStore((s) => s.lastDrawnCard);
  const closeModal = useLocalGameStore((s) => s.closeModal);

  if (!isOpen || !lastDrawnCard) return null;

  const card = lastDrawnCard;
  const colors = CARD_COLORS[card.type] ?? { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3' };
  const icon = CARD_ICONS[card.type] ?? '?';

  return (
    <Modal isOpen={isOpen} onClose={closeModal} size="sm">
      <div className="text-center">
        {/* Card visual */}
        <div
          className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
          style={{
            backgroundColor: colors.bg,
            border: `3px solid ${colors.border}`,
          }}
        >
          <span
            className="text-3xl font-black"
            style={{ color: colors.border }}
          >
            {icon}
          </span>
        </div>

        {/* Card type label */}
        <div
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: colors.border }}
        >
          {card.type === 'chance' ? 'Chance Card' : 'Community Chest'}
        </div>

        {/* Card title */}
        <h3 className="text-xl font-bold text-white mb-3">{card.title}</h3>

        {/* Card description */}
        <p className="text-sm text-gray-300 leading-relaxed mb-4">
          {card.description}
        </p>

        {/* Financial impact hint */}
        {card.value !== undefined && card.value !== null && (
          <div className="mb-4">
            {card.action.includes('pay') || card.action === 'doctors-fee' || card.action === 'hospital-fees' || card.action === 'school-fees' || card.action === 'pay-poor-tax' || card.action === 'elected-chairman' ? (
              <span className="text-lg font-bold text-red-400">-${card.value}</span>
            ) : (
              <span className="text-lg font-bold text-green-400">+${card.value}</span>
            )}
          </div>
        )}

        {/* Special actions */}
        {card.action === 'go-to-jail' && (
          <div className="text-lg font-bold text-red-400 mb-4">Go to Jail!</div>
        )}
        {card.action === 'advance-to-go' && (
          <div className="text-lg font-bold text-green-400 mb-4">Advance to GO — Collect $200</div>
        )}
        {card.action === 'get-out-of-jail-free' && (
          <div className="text-lg font-bold text-yellow-400 mb-4">Get Out of Jail Free</div>
        )}

        {/* OK button */}
        <button
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-8 rounded-lg transition"
          onClick={closeModal}
        >
          OK
        </button>
      </div>
    </Modal>
  );
}
