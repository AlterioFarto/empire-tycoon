import type { MonopolyCard, Player, PropertyTile } from '@monopoly/shared';
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS, shuffleCards } from '@monopoly/shared';

export interface CardDeck {
  cards: MonopolyCard[];
  discardPile: MonopolyCard[];
}

export function createChanceDeck(): CardDeck {
  return { cards: shuffleCards(CHANCE_CARDS), discardPile: [] };
}

export function createCommunityChestDeck(): CardDeck {
  return { cards: shuffleCards(COMMUNITY_CHEST_CARDS), discardPile: [] };
}

export function drawCard(deck: CardDeck): { card: MonopolyCard; deck: CardDeck } {
  let cards = deck.cards;
  if (cards.length === 0) {
    cards = shuffleCards(deck.discardPile);
    return drawCard({ cards, discardPile: [] });
  }
  const card = cards[0]!;
  return {
    card,
    deck: { cards: cards.slice(1), discardPile: [...deck.discardPile] },
  };
}

export function returnJailCardToDeck(deck: CardDeck, card: MonopolyCard): CardDeck {
  return { ...deck, cards: [...deck.cards, card] };
}

export interface CardResolution {
  player: Player;
  newPosition?: number;
  collectedMoney?: number;
  paidMoney?: number;
  log: string;
}

export function resolveCardAction(
  card: MonopolyCard,
  player: Player,
  players: Player[],
  boardSize: number,
  propertyTileMap: Map<number, PropertyTile>,
): CardResolution {
  switch (card.action) {
    case 'advance-to-go':
      return {
        player: { ...player, position: 0, money: player.money + 200 },
        newPosition: 0,
        collectedMoney: 200,
        log: `${player.name} advances to GO and collects $200.`,
      };

    case 'advance-to-tile':
    case 'advance-to-illinois-ave':
    case 'advance-to-st-charles-place':
    case 'advance-to-reading-railroad':
      if (card.targetTileId != null) {
        const passedGo = card.targetTileId < player.position;
        const moneyGained = passedGo ? 200 : 0;
        return {
          player: { ...player, position: card.targetTileId, money: player.money + moneyGained },
          newPosition: card.targetTileId,
          collectedMoney: moneyGained,
          log: `${player.name} advances to ${card.title}.${moneyGained > 0 ? ' Collects $200 for passing GO.' : ''}`,
        };
      }
      return { player, log: `${player.name} drew ${card.title}.` };

    case 'advance-to-nearest-railroad': {
      const railroadIndices = [5, 15, 25, 35];
      let nearest = Number.MAX_SAFE_INTEGER;
      let nearestIdx = -1;
      for (const idx of railroadIndices) {
        let dist = (idx - player.position + boardSize) % boardSize;
        if (dist === 0) dist = boardSize;
        if (dist < nearest) {
          nearest = dist;
          nearestIdx = idx;
        }
      }
      const passedGo = player.position + nearest >= boardSize;
      const moneyGained = passedGo ? 200 : 0;
      return {
        player: { ...player, position: nearestIdx, money: player.money + moneyGained },
        newPosition: nearestIdx,
        collectedMoney: moneyGained,
        log: `${player.name} advances to the nearest Railroad.${moneyGained > 0 ? ' Collects $200 for passing GO.' : ''}`,
      };
    }

    case 'advance-to-nearest-utility': {
      const utilityIndices = [12, 28];
      let nearest = Number.MAX_SAFE_INTEGER;
      let nearestIdx = -1;
      for (const idx of utilityIndices) {
        let dist = (idx - player.position + boardSize) % boardSize;
        if (dist === 0) dist = boardSize;
        if (dist < nearest) {
          nearest = dist;
          nearestIdx = idx;
        }
      }
      const passedGo = player.position + nearest >= boardSize;
      const moneyGained = passedGo ? 200 : 0;
      return {
        player: { ...player, position: nearestIdx, money: player.money + moneyGained },
        newPosition: nearestIdx,
        collectedMoney: moneyGained,
        log: `${player.name} advances to the nearest Utility.${moneyGained > 0 ? ' Collects $200 for passing GO.' : ''}`,
      };
    }

    case 'bank-pays-you':
    case 'bank-error':
    case 'stock-sale':
    case 'insurance':
    case 'inherit-money':
    case 'building-loan-matures':
    case 'crossword-competition':
    case 'consultancy-fee':
    case 'income-tax-refund':
    case 'beauty-contest':
      return {
        player: { ...player, money: player.money + (card.value ?? 0) },
        collectedMoney: card.value,
        log: `${player.name} collects $${card.value}. (${card.title})`,
      };

    case 'pay-bank':
    case 'doctors-fee':
    case 'school-fees':
    case 'hospital-fees':
    case 'pay-poor-tax':
      return {
        player: { ...player, money: player.money - (card.value ?? 0) },
        paidMoney: card.value,
        log: `${player.name} pays $${card.value}. (${card.title})`,
      };

    case 'pay-each-player':
    case 'elected-chairman': {
      const amount = card.value ?? 0;
      const otherPlayers = players.filter(p => p.id !== player.id && !p.bankrupt);
      const totalPayment = amount * otherPlayers.length;
      return {
        player: { ...player, money: player.money - totalPayment },
        paidMoney: totalPayment,
        log: `${player.name} pays $${amount} to each player. (${card.title})`,
      };
    }

    case 'collect-from-each-player':
    case 'holiday-fund':
    case 'birthday': {
      const amount = card.value ?? 0;
      const otherPlayers = players.filter(p => p.id !== player.id && !p.bankrupt);
      const totalCollection = amount * otherPlayers.length;
      return {
        player: { ...player, money: player.money + totalCollection },
        collectedMoney: totalCollection,
        log: `${player.name} collects $${amount} from each player. (${card.title})`,
      };
    }

    case 'go-to-jail':
      return {
        player: { ...player, inJail: true, jailTurns: 0, position: 10 },
        newPosition: 10,
        log: `${player.name} is sent directly to Jail!`,
      };

    case 'get-out-of-jail-free':
      return {
        player: { ...player, getOutOfJailCards: player.getOutOfJailCards + 1 },
        log: `${player.name} receives a Get Out of Jail Free card.`,
      };

    case 'go-back-3': {
      const newPos = ((player.position - 3) % boardSize + boardSize) % boardSize;
      return {
        player: { ...player, position: newPos },
        newPosition: newPos,
        log: `${player.name} goes back 3 spaces.`,
      };
    }

    case 'make-repairs':
    case 'street-repairs': {
      const houseCost = card.value ?? 25;
      const hotelCost = card.action === 'street-repairs' ? 115 : 100;
      const ownedProperties = Array.from(propertyTileMap.values())
        .filter(p => p.ownerId === player.id);
      let totalCost = 0;
      for (const prop of ownedProperties) {
        if (prop.isHotel) totalCost += hotelCost;
        else totalCost += prop.houses * houseCost;
      }
      return {
        player: { ...player, money: player.money - totalCost },
        paidMoney: totalCost,
        log: `${player.name} pays $${totalCost} for repairs. (${card.title})`,
      };
    }

    default:
      return { player, log: `${player.name} drew ${card.title}.` };
  }
}
