import type { TurnState, DiceRoll, TurnPhase } from '@monopoly/shared';

export function createTurnState(playerId: string): TurnState {
  return {
    playerId,
    phase: 'waiting-to-roll',
    diceRoll: null,
    doublesCount: 0,
    movesRemaining: 0,
    hasBoughtProperty: false,
    hasDrawnCard: false,
    actionsThisTurn: [],
    startPosition: 0,
    jailRelease: false,
  };
}

export function setPhase(turn: TurnState, phase: TurnPhase): TurnState {
  return { ...turn, phase };
}

export function setDiceRoll(turn: TurnState, roll: DiceRoll): TurnState {
  const isDoubles = roll.isDoubles;
  return {
    ...turn,
    diceRoll: roll,
    doublesCount: isDoubles ? turn.doublesCount + 1 : 0,
    movesRemaining: roll.total,
  };
}

export function markBoughtProperty(turn: TurnState): TurnState {
  return { ...turn, hasBoughtProperty: true };
}

export function markDrawnCard(turn: TurnState): TurnState {
  return { ...turn, hasDrawnCard: true };
}

export function addAction(turn: TurnState, action: string): TurnState {
  return { ...turn, actionsThisTurn: [...turn.actionsThisTurn, action] };
}

export function setStartPosition(turn: TurnState, position: number): TurnState {
  return { ...turn, startPosition: position };
}

export function canRollForJail(turn: TurnState): boolean {
  return turn.phase === 'jail-options';
}

export function canRollDice(turn: TurnState): boolean {
  return turn.phase === 'waiting-to-roll';
}

export function canEndTurn(turn: TurnState): boolean {
  return turn.phase === 'optional-actions' || turn.phase === 'end-turn';
}

export function hasThirdDouble(turn: TurnState): boolean {
  return turn.doublesCount >= 3;
}
