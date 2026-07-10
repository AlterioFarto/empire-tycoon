import type { GameState, TurnPhase, PropertyTile } from '@monopoly/shared';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePlayerTurn(game: GameState, playerId: string): ValidationResult {
  if (!game.currentTurn) {
    return { valid: false, error: 'No active turn' };
  }
  if (game.currentTurn.playerId !== playerId) {
    return { valid: false, error: 'Not your turn' };
  }
  const player = game.players.find(p => p.id === playerId);
  if (!player) {
    return { valid: false, error: 'Player not found' };
  }
  if (player.bankrupt) {
    return { valid: false, error: 'Player is bankrupt' };
  }
  return { valid: true };
}

export function validatePhase(game: GameState, expectedPhase: TurnPhase): ValidationResult {
  if (!game.currentTurn) {
    return { valid: false, error: 'No active turn' };
  }
  if (game.currentTurn.phase !== expectedPhase) {
    return { valid: false, error: `Expected phase ${expectedPhase}, got ${game.currentTurn.phase}` };
  }
  return { valid: true };
}

export function validateRollDice(game: GameState, playerId: string): ValidationResult {
  const turnResult = validatePlayerTurn(game, playerId);
  if (!turnResult.valid) return turnResult;

  const player = game.players.find(p => p.id === playerId)!;
  if (player.inJail) {
    const phaseResult = validatePhase(game, 'jail-options');
    if (!phaseResult.valid) {
      return validatePhase(game, 'waiting-to-roll');
    }
    return validatePhase(game, 'jail-options');
  }

  return validatePhase(game, 'waiting-to-roll');
}

export function validateBuyProperty(game: GameState, playerId: string): ValidationResult {
  const turnResult = validatePlayerTurn(game, playerId);
  if (!turnResult.valid) return turnResult;
  return validatePhase(game, 'deciding-buy');
}

export function validateBuildHouse(game: GameState, playerId: string, propertyId: string, tiles: PropertyTile[]): ValidationResult {
  const turnResult = validatePlayerTurn(game, playerId);
  if (!turnResult.valid) return turnResult;

  const property = tiles.find(t => t.id === propertyId);
  if (!property) return { valid: false, error: 'Property not found' };

  return { valid: true };
}

export function validateEndTurn(game: GameState, playerId: string): ValidationResult {
  const turnResult = validatePlayerTurn(game, playerId);
  if (!turnResult.valid) return turnResult;
  return validatePhase(game, 'end-turn');
}
