import { useState } from 'react';
import { useLocalGameStore } from '../store/localGameStore.js';
import { Modal } from './Modal.js';
import type { GameSettings } from '@monopoly/shared';

export function SettingsModal() {
  const isOpen = useLocalGameStore((s) => s.activeModal === 'settings');
  const closeModal = useLocalGameStore((s) => s.closeModal);
  const settings = useLocalGameStore((s) => s.settings);
  const updateSettings = useLocalGameStore((s) => s.updateSettings);
  const game = useLocalGameStore((s) => s.game);

  const [draft, setDraft] = useState<Partial<GameSettings>>({});

  if (!isOpen) return null;

  const current = { ...settings, ...draft };
  const isInGame = !!game;

  function handleSave() {
    if (Object.keys(draft).length > 0) {
      updateSettings(draft);
      setDraft({});
    }
    closeModal();
  }

  function update<K extends keyof GameSettings>(key: K, value: GameSettings[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="House Rules" size="md">
      <div className="space-y-5">
        {/* Starting Cash */}
        <SettingRow
          label="Starting Cash"
          description="How much money each player starts with"
        >
          <div className="flex items-center gap-2">
            {[500, 1000, 1500, 2000, 3000].map((amount) => (
              <button
                key={amount}
                className={`text-xs px-3 py-1.5 rounded-lg transition ${
                  current.startingCash === amount
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                onClick={() => update('startingCash', amount)}
                disabled={isInGame}
              >
                ${amount}
              </button>
            ))}
          </div>
        </SettingRow>

        {/* Free Parking Jackpot */}
        <SettingRow
          label="Free Parking Jackpot"
          description="Tax and fine money goes to Free Parking pot"
        >
          <ToggleSwitch
            checked={current.freeParkingJackpot}
            onChange={(v) => update('freeParkingJackpot', v)}
            disabled={isInGame}
          />
        </SettingRow>

        {/* Double Money on GO */}
        <SettingRow
          label="Double Salary on GO"
          description="Collect $400 instead of $200 when passing GO"
        >
          <ToggleSwitch
            checked={current.doubleMoneyOnGo}
            onChange={(v) => update('doubleMoneyOnGo', v)}
            disabled={isInGame}
          />
        </SettingRow>

        {/* No Auctions */}
        <SettingRow
          label="No Auctions"
          description="Properties go unowned if declined (no auction)"
        >
          <ToggleSwitch
            checked={current.noAuctions}
            onChange={(v) => update('noAuctions', v)}
            disabled={isInGame}
          />
        </SettingRow>

        {/* House Limit */}
        <SettingRow
          label="House Limit"
          description="Maximum houses available in the bank"
        >
          <div className="flex items-center gap-2">
            {[16, 32, 48].map((limit) => (
              <button
                key={limit}
                className={`text-xs px-3 py-1.5 rounded-lg transition ${
                  current.houseLimit === limit
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                onClick={() => update('houseLimit', limit)}
                disabled={isInGame}
              >
                {limit}
              </button>
            ))}
          </div>
        </SettingRow>

        {/* Hotel Limit */}
        <SettingRow
          label="Hotel Limit"
          description="Maximum hotels available in the bank"
        >
          <div className="flex items-center gap-2">
            {[8, 12, 16].map((limit) => (
              <button
                key={limit}
                className={`text-xs px-3 py-1.5 rounded-lg transition ${
                  current.hotelLimit === limit
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                onClick={() => update('hotelLimit', limit)}
                disabled={isInGame}
              >
                {limit}
              </button>
            ))}
          </div>
        </SettingRow>

        {isInGame && (
          <p className="text-xs text-yellow-400 bg-yellow-900/20 rounded-lg p-3">
            Some settings can only be changed before the game starts.
          </p>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-700 flex justify-end gap-2">
        <button
          className="text-gray-400 hover:text-white text-sm transition py-2 px-4"
          onClick={closeModal}
        >
          Cancel
        </button>
        <button
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition text-sm"
          onClick={handleSave}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-gray-400 mt-0.5">{description}</div>
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-green-600' : 'bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
