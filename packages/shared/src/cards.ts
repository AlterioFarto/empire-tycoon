import type { MonopolyCard } from './types.js';

export const CHANCE_CARDS: MonopolyCard[] = [
  { id: 'chance-1', type: 'chance', title: 'Advance to Go', description: 'Advance to Go. Collect $200.', action: 'advance-to-go' },
  { id: 'chance-2', type: 'chance', title: 'Advance to Illinois Ave', description: 'Advance to Illinois Avenue. If you pass Go, collect $200.', action: 'advance-to-illinois-ave', targetTileId: 24 },
  { id: 'chance-3', type: 'chance', title: 'Advance to St. Charles Place', description: 'Advance to St. Charles Place. If you pass Go, collect $200.', action: 'advance-to-st-charles-place', targetTileId: 11 },
  { id: 'chance-4', type: 'chance', title: 'Nearest Railroad', description: 'Advance to the nearest Railroad. If unowned, you may buy it. If owned, pay owner twice the rent.', action: 'advance-to-nearest-railroad' },
  { id: 'chance-5', type: 'chance', title: 'Nearest Railroad', description: 'Advance to the nearest Railroad. If unowned, you may buy it. If owned, pay owner twice the rent.', action: 'advance-to-nearest-railroad' },
  { id: 'chance-6', type: 'chance', title: 'Nearest Utility', description: 'Advance to the nearest Utility. If unowned, you may buy it. If owned, roll dice and pay 10 times the amount.', action: 'advance-to-nearest-utility' },
  { id: 'chance-7', type: 'chance', title: 'Bank Pays You', description: 'Bank pays you a dividend of $50.', action: 'bank-pays-you', value: 50 },
  { id: 'chance-8', type: 'chance', title: 'Get Out of Jail Free', description: 'Get Out of Jail Free. This card may be kept until needed or sold.', action: 'get-out-of-jail-free' },
  { id: 'chance-9', type: 'chance', title: 'Go Back 3 Spaces', description: 'Go Back 3 Spaces.', action: 'go-back-3' },
  { id: 'chance-10', type: 'chance', title: 'Go to Jail', description: 'Go directly to Jail. Do not pass Go, do not collect $200.', action: 'go-to-jail' },
  { id: 'chance-11', type: 'chance', title: 'Make Repairs', description: 'Make general repairs on all your property. Pay $25 per house, $100 per hotel.', action: 'make-repairs', value: 25 },
  { id: 'chance-12', type: 'chance', title: 'Pay Poor Tax', description: 'Pay poor tax of $15.', action: 'pay-poor-tax', value: 15 },
  { id: 'chance-13', type: 'chance', title: 'Advance to Reading Railroad', description: 'Take a trip to Reading Railroad. If you pass Go, collect $200.', action: 'advance-to-reading-railroad', targetTileId: 5 },
  { id: 'chance-14', type: 'chance', title: 'Elected Chairman', description: 'You have been elected Chairman of the Board. Pay each player $50.', action: 'elected-chairman', value: 50 },
  { id: 'chance-15', type: 'chance', title: 'Building Loan Matures', description: 'Your building loan matures. Collect $150.', action: 'building-loan-matures', value: 150 },
  { id: 'chance-16', type: 'chance', title: 'Crossword Competition', description: 'You have won a crossword competition. Collect $100.', action: 'crossword-competition', value: 100 },
];

export const COMMUNITY_CHEST_CARDS: MonopolyCard[] = [
  { id: 'cc-1', type: 'community-chest', title: 'Advance to Go', description: 'Advance to Go. Collect $200.', action: 'advance-to-go' },
  { id: 'cc-2', type: 'community-chest', title: 'Bank Error', description: 'Bank error in your favor. Collect $200.', action: 'bank-error', value: 200 },
  { id: 'cc-3', type: 'community-chest', title: "Doctor's Fee", description: "Pay doctor's fee of $50.", action: 'doctors-fee', value: 50 },
  { id: 'cc-4', type: 'community-chest', title: 'Stock Sale', description: 'From sale of stock you get $50.', action: 'stock-sale', value: 50 },
  { id: 'cc-5', type: 'community-chest', title: 'Get Out of Jail Free', description: 'Get Out of Jail Free. This card may be kept until needed or sold.', action: 'get-out-of-jail-free' },
  { id: 'cc-6', type: 'community-chest', title: 'Go to Jail', description: 'Go directly to Jail. Do not pass Go, do not collect $200.', action: 'go-to-jail' },
  { id: 'cc-7', type: 'community-chest', title: 'Holiday Fund', description: 'Grand Opera Night. Collect $50 from every player for opening night seats.', action: 'holiday-fund', value: 50 },
  { id: 'cc-8', type: 'community-chest', title: 'Income Tax Refund', description: 'Income tax refund. Collect $20.', action: 'income-tax-refund', value: 20 },
  { id: 'cc-9', type: 'community-chest', title: 'Birthday', description: 'It is your birthday. Collect $10 from each player.', action: 'birthday', value: 10 },
  { id: 'cc-10', type: 'community-chest', title: 'Insurance', description: 'Life insurance matures. Collect $100.', action: 'insurance', value: 100 },
  { id: 'cc-11', type: 'community-chest', title: 'Hospital Fees', description: 'Pay hospital fees of $100.', action: 'hospital-fees', value: 100 },
  { id: 'cc-12', type: 'community-chest', title: 'School Fees', description: 'Pay school fees of $50.', action: 'school-fees', value: 50 },
  { id: 'cc-13', type: 'community-chest', title: 'Consultancy Fee', description: 'Receive consultancy fee of $25.', action: 'consultancy-fee', value: 25 },
  { id: 'cc-14', type: 'community-chest', title: 'Street Repairs', description: 'You are assessed for street repairs. $40 per house, $115 per hotel.', action: 'street-repairs', value: 40 },
  { id: 'cc-15', type: 'community-chest', title: 'Beauty Contest', description: 'You have won second prize in a beauty contest. Collect $10.', action: 'beauty-contest', value: 10 },
  { id: 'cc-16', type: 'community-chest', title: 'Inherit Money', description: 'You inherit $100.', action: 'inherit-money', value: 100 },
];

export function shuffleCards<T>(deck: T[]): T[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}
