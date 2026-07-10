import { describe, it, expect } from 'vitest';
import { createAuction, placeBid, passOnAuction, isAuctionOver, getAuctionWinner } from '../src/auction/auction.js';

describe('Auction', () => {
  it('should create an auction', () => {
    const auction = createAuction('property-1', ['p1', 'p2', 'p3']);
    expect(auction.active).toBe(true);
    expect(auction.propertyId).toBe('property-1');
    expect(auction.bidders).toEqual(['p1', 'p2', 'p3']);
    expect(auction.currentBid).toBe(0);
  });

  it('should place a bid', () => {
    const auction = createAuction('property-1', ['p1', 'p2', 'p3']);
    const updated = placeBid(auction, 'p1', 50);
    expect(updated).not.toBeNull();
    expect(updated!.currentBid).toBe(50);
    expect(updated!.currentBidderId).toBe('p1');
  });

  it('should reject bid lower than current', () => {
    const auction = createAuction('property-1', ['p1', 'p2']);
    const withBid = placeBid(auction, 'p1', 50);
    const rejected = placeBid(withBid!, 'p2', 30);
    expect(rejected).toBeNull();
  });

  it('should pass on auction', () => {
    const auction = createAuction('property-1', ['p1', 'p2', 'p3']);
    const updated = passOnAuction(auction, 'p1');
    expect(updated.passedBidders).toContain('p1');
    expect(updated.bidders).not.toContain('p1');
  });

  it('should detect auction over when one bidder remains', () => {
    const auction = createAuction('property-1', ['p1', 'p2']);
    const withBid = placeBid(auction, 'p1', 50)!;
    const afterPass = passOnAuction(withBid, 'p2');
    expect(isAuctionOver(afterPass)).toBe(true);
  });

  it('should get auction winner', () => {
    const auction = createAuction('property-1', ['p1', 'p2']);
    const withBid = placeBid(auction, 'p1', 50)!;
    const winner = getAuctionWinner(withBid);
    expect(winner.winnerId).toBe('p1');
    expect(winner.amount).toBe(50);
  });

  it('should return no winner if no bids placed', () => {
    const auction = createAuction('property-1', ['p1', 'p2']);
    const winner = getAuctionWinner(auction);
    expect(winner.winnerId).toBeNull();
    expect(winner.amount).toBe(0);
  });
});
