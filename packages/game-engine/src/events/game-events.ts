import type { GameLogEntry, GameLogType } from '@monopoly/shared';

let logIdCounter = 0;

export function createLogEntry(
  type: GameLogType,
  playerId: string | null,
  message: string,
  data?: Record<string, unknown>,
): GameLogEntry {
  logIdCounter += 1;
  return {
    id: `log-${logIdCounter}-${Date.now()}`,
    timestamp: Date.now(),
    type,
    playerId,
    message,
    data,
  };
}

export function resetLogCounter(): void {
  logIdCounter = 0;
}
