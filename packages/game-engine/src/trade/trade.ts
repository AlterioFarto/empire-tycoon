import type { TradeOffer } from '@monopoly/shared';

export function createTradeOffer(
  fromPlayerId: string,
  toPlayerId: string,
  offerProperties: string[],
  offerMoney: number,
  requestProperties: string[],
  requestMoney: number,
): TradeOffer {
  if (fromPlayerId === toPlayerId) throw new Error('Cannot trade with self');
  if (offerMoney < 0) throw new Error('Offer money cannot be negative');
  if (requestMoney < 0) throw new Error('Request money cannot be negative');
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
  if (offer.status !== 'pending') return offer;
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
