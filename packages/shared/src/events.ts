import type { ServerEventPayloads, ClientEventPayloads } from './types.js';

export type ServerEvent = keyof ServerEventPayloads;
export type ClientEvent = keyof ClientEventPayloads;

export type ServerEventCallback<E extends ServerEvent> = (
  payload: ServerEventPayloads[E],
) => void;

export type ClientEventCallback<E extends ClientEvent> = (
  payload: ClientEventPayloads[E],
) => void;

export const SERVER_EVENTS: Record<ServerEvent, string> = {
  'lobby:created': 'lobby:created',
  'lobby:joined': 'lobby:joined',
  'lobby:left': 'lobby:left',
  'lobby:updated': 'lobby:updated',
  'lobby:player-ready': 'lobby:player-ready',
  'game:started': 'game:started',
  'game:state-update': 'game:state-update',
  'game:turn-change': 'game:turn-change',
  'game:dice-roll': 'game:dice-roll',
  'game:player-moved': 'game:player-moved',
  'game:property-bought': 'game:property-bought',
  'game:auction-started': 'game:auction-started',
  'game:auction-bid': 'game:auction-bid',
  'game:auction-ended': 'game:auction-ended',
  'game:trade-offer': 'game:trade-offer',
  'game:trade-update': 'game:trade-update',
  'game:card-drawn': 'game:card-drawn',
  'game:jail-update': 'game:jail-update',
  'game:player-bankrupt': 'game:player-bankrupt',
  'game:player-won': 'game:player-won',
  'game:log': 'game:log',
  'chat:message': 'chat:message',
  'error': 'error',
};

export const CLIENT_EVENTS: Record<ClientEvent, string> = {
  'lobby:create': 'lobby:create',
  'lobby:join': 'lobby:join',
  'lobby:leave': 'lobby:leave',
  'lobby:ready': 'lobby:ready',
  'lobby:start-game': 'lobby:start-game',
  'lobby:update-settings': 'lobby:update-settings',
  'game:roll-dice': 'game:roll-dice',
  'game:buy-property': 'game:buy-property',
  'game:pay-tax-flat': 'game:pay-tax-flat',
  'game:pay-tax-percentage': 'game:pay-tax-percentage',
  'game:pass-auction': 'game:pass-auction',
  'game:auction-bid': 'game:auction-bid',
  'game:build-house': 'game:build-house',
  'game:sell-house': 'game:sell-house',
  'game:mortgage': 'game:mortgage',
  'game:unmortgage': 'game:unmortgage',
  'game:use-jail-card': 'game:use-jail-card',
  'game:pay-jail-fine': 'game:pay-jail-fine',
  'game:roll-for-jail': 'game:roll-for-jail',
  'game:end-turn': 'game:end-turn',
  'game:trade-offer': 'game:trade-offer',
  'game:trade-accept': 'game:trade-accept',
  'game:trade-reject': 'game:trade-reject',
  'game:trade-cancel': 'game:trade-cancel',
  'game:send-chat': 'game:send-chat',
  'game:reconnect': 'game:reconnect',
};
