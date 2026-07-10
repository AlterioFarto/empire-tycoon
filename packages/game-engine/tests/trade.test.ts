import { describe, it, expect } from 'vitest';
import { createTradeOffer, acceptTrade, rejectTrade, cancelTrade, canAcceptTrade } from '../src/trade/trade.js';

describe('Trade', () => {
  it('should create a trade offer', () => {
    const offer = createTradeOffer('p1', 'p2', ['property-1'], 50, ['property-2'], 0);
    expect(offer.fromPlayerId).toBe('p1');
    expect(offer.toPlayerId).toBe('p2');
    expect(offer.offerProperties).toEqual(['property-1']);
    expect(offer.offerMoney).toBe(50);
    expect(offer.status).toBe('pending');
  });

  it('should accept trade', () => {
    const offer = createTradeOffer('p1', 'p2', ['property-1'], 0, [], 0);
    const accepted = acceptTrade(offer);
    expect(accepted.status).toBe('accepted');
  });

  it('should reject trade', () => {
    const offer = createTradeOffer('p1', 'p2', ['property-1'], 0, [], 0);
    const rejected = rejectTrade(offer);
    expect(rejected.status).toBe('rejected');
  });

  it('should cancel trade', () => {
    const offer = createTradeOffer('p1', 'p2', ['property-1'], 0, [], 0);
    const cancelled = cancelTrade(offer);
    expect(cancelled.status).toBe('cancelled');
  });

  it('should only accept pending trades', () => {
    const offer = createTradeOffer('p1', 'p2', ['property-1'], 0, [], 0);
    expect(canAcceptTrade(offer)).toBe(true);

    const accepted = acceptTrade(offer);
    expect(canAcceptTrade(accepted)).toBe(false);
  });
});
