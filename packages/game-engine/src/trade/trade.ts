import type { TradeOffer } from '@monopoly/shared';

export function createTradeOffer(
  fromPlayerId: string,
  toPlayerId: string,
  offerProperties: string[],
  offerMoney: number,
  requestProperties: string[],
  requestMoney: number,
): TradeOffer {
  return {
    fromPlayerId,
    toPlayerId,
    offerProperties,
    offerMoney,
    requestProperties,
    requestMoney,
    status: 'pending',
  };
}

export function acceptTrade(offer: TradeOffer): TradeOffer {
  return { ...offer, status: 'accepted' };
}

export function rejectTrade(offer: TradeOffer): TradeOffer {
  return { ...offer, status: 'rejected' };
}

export function cancelTrade(offer: TradeOffer): TradeOffer {
  return { ...offer, status: 'cancelled' };
}

export function canAcceptTrade(offer: TradeOffer): boolean {
  return offer.status === 'pending';
}
