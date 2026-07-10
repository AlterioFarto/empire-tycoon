import { useLocalGameStore } from '../store/localGameStore.js';
import { Modal } from './Modal.js';

const ACCENTS: Record<string, { icon: string; text: string }> = {
  go: { icon: '💰', text: '#4ade80' },
  rent: { icon: '💸', text: '#f87171' },
  own: { icon: '🏠', text: '#cbd5e1' },
};

export function InfoPopup() {
  const isOpen = useLocalGameStore((s) => s.activeModal === 'info');
  const modalData = useLocalGameStore((s) => s.modalData);
  const closeModal = useLocalGameStore((s) => s.closeModal);

  if (!isOpen) return null;

  const accent = (modalData.accent as string) ?? 'go';
  const style = ACCENTS[accent] ?? ACCENTS.go!;
  const title = (modalData.title as string) ?? 'Notice';
  const message = (modalData.message as string) ?? '';

  return (
    <Modal isOpen={isOpen} onClose={closeModal} size="sm">
      <div className="text-center">
        <div className="text-5xl mb-3">{style.icon}</div>
        <h3 className="text-xl font-bold mb-2" style={{ color: style.text }}>
          {title}
        </h3>
        <p className="text-sm text-gray-300 leading-relaxed mb-5">{message}</p>
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
