import type { AuctionState } from '@monopoly/shared';
import { AUCTION_MIN_RAISE } from '@monopoly/shared';

export function createAuction(propertyId: string, playerIds: string[]): AuctionState {
  return {
    active: true,
    propertyId,
    currentBidderId: null,
    currentBid: 0,
    bidders: [...playerIds],
    passedBidders: [],
    startingBid: 0,
  };
}

export function placeBid(auction: AuctionState, playerId: string, amount: number): AuctionState | null {
  if (!auction.active) return null;
  if (!auction.bidders.includes(playerId)) return null;
  if (amount <= auction.currentBid) return null;
  if (auction.passedBidders.includes(playerId)) return null;

  return {
    ...auction,
    currentBidderId: playerId,
    currentBid: amount,
  };
}

export function passOnAuction(auction: AuctionState, playerId: string): AuctionState {
  return {
    ...auction,
    passedBidders: [...auction.passedBidders, playerId],
    bidders: auction.bidders.filter(id => id !== playerId),
  };
}

export function isAuctionOver(auction: AuctionState): boolean {
  return auction.bidders.length <= 1 || auction.passedBidders.length >= auction.bidders.length + auction.passedBidders.length - 1;
}

export function getAuctionWinner(auction: AuctionState): { winnerId: string | null; amount: number } {
  if (!auction.active) return { winnerId: null, amount: 0 };
  if (auction.currentBidderId && auction.currentBid > 0) {
    return { winnerId: auction.currentBidderId, amount: auction.currentBid };
  }
  return { winnerId: null, amount: 0 };
}

export function getMinimumBid(auction: AuctionState): number {
  return auction.currentBid + AUCTION_MIN_RAISE;
}
