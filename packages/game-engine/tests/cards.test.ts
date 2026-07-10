import { describe, it, expect } from 'vitest';
import { createChanceDeck, createCommunityChestDeck, drawCard, resolveCardAction } from '../src/cards/cards.js';
import { createPlayer } from '../src/player/player.js';
import type { MonopolyCard, PropertyTile } from '@monopoly/shared';

describe('Cards', () => {
  describe('Decks', () => {
    it('should create chance deck with 16 cards', () => {
      const deck = createChanceDeck();
      expect(deck.cards.length).toBe(16);
    });

    it('should create community chest deck with 16 cards', () => {
      const deck = createCommunityChestDeck();
      expect(deck.cards.length).toBe(16);
    });

    it('should shuffle cards', () => {
      const deck = createChanceDeck();
      // Just verify all original cards are present
      const titles = deck.cards.map(c => c.title);
      expect(titles).toContain('Advance to Go');
      expect(titles).toContain('Go to Jail');
    });
  });

  describe('drawCard', () => {
    it('should draw a card from the deck', () => {
      const deck = createChanceDeck();
      const { card, deck: newDeck } = drawCard(deck);
      expect(card).toBeDefined();
      expect(card.type).toBe('chance');
      expect(newDeck.cards.length).toBe(15);
    });

    it('should reshuffle discard pile when deck is empty', () => {
      const deck = createChanceDeck();
      const allCards = [...deck.cards];
      const result = drawCard({ cards: [], discardPile: allCards });
      expect(result.card).toBeDefined();
    });
  });

  describe('resolveCardAction', () => {
    const player = createPlayer('p1', 'Alice', 'red', 1500, 0);
    const boardSize = 40;
    const propertyMap = new Map<number, PropertyTile>();

    it('should handle advance-to-go', () => {
      const card: MonopolyCard = { id: 'c1', type: 'chance', title: 'Advance to Go', description: '', action: 'advance-to-go' };
      const result = resolveCardAction(card, player, [], boardSize, propertyMap);
      expect(result.player.position).toBe(0);
      expect(result.player.money).toBe(1700);
    });

    it('should handle bank-pays-you', () => {
      const card: MonopolyCard = { id: 'c1', type: 'chance', title: 'Bank Pays You', description: '', action: 'bank-pays-you', value: 50 };
      const result = resolveCardAction(card, player, [], boardSize, propertyMap);
      expect(result.player.money).toBe(1550);
    });

    it('should handle pay-bank', () => {
      const card: MonopolyCard = { id: 'c1', type: 'chance', title: 'Pay Poor Tax', description: '', action: 'pay-poor-tax', value: 15 };
      const result = resolveCardAction(card, player, [], boardSize, propertyMap);
      expect(result.player.money).toBe(1485);
    });

    it('should handle go-to-jail', () => {
      const card: MonopolyCard = { id: 'c1', type: 'chance', title: 'Go to Jail', description: '', action: 'go-to-jail' };
      const result = resolveCardAction(card, player, [], boardSize, propertyMap);
      expect(result.player.inJail).toBe(true);
      expect(result.player.position).toBe(10);
    });

    it('should handle get-out-of-jail-free', () => {
      const card: MonopolyCard = { id: 'c1', type: 'chance', title: 'Get Out of Jail Free', description: '', action: 'get-out-of-jail-free' };
      const result = resolveCardAction(card, player, [], boardSize, propertyMap);
      expect(result.player.getOutOfJailCards).toBe(1);
    });

    it('should handle go-back-3', () => {
      const movedPlayer = { ...player, position: 5 };
      const card: MonopolyCard = { id: 'c1', type: 'chance', title: 'Go Back 3 Spaces', description: '', action: 'go-back-3' };
      const result = resolveCardAction(card, movedPlayer, [], boardSize, propertyMap);
      expect(result.player.position).toBe(2);
    });

    it('should handle collect from each player', () => {
      const card: MonopolyCard = { id: 'c1', type: 'community-chest', title: 'Birthday', description: '', action: 'birthday', value: 10 };
      const otherPlayers = [
        createPlayer('p2', 'Bob', 'blue', 1500, 1),
        createPlayer('p3', 'Charlie', 'green', 1500, 2),
      ];
      const result = resolveCardAction(card, player, otherPlayers, boardSize, propertyMap);
      expect(result.player.money).toBe(1520); // collected $10 from each of 2 players
    });
  });
});
