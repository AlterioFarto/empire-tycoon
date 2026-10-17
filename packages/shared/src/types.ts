// ──────────────────────────────────────────────
// Monopoly Shared Types
// ──────────────────────────────────────────────

export type GameMode = 'online' | 'local';

export type TileType =
  | 'go'
  | 'property'
  | 'community-chest'
  | 'tax'
  | 'railroad'
  | 'chance'
  | 'jail'
  | 'utility'
  | 'free-parking'
  | 'go-to-jail';

export type ColorGroup =
  | 'brown'
  | 'light-blue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'dark-blue';

export type CardType = 'chance' | 'community-chest';

export type CardAction =
  | 'advance-to-go'
  | 'advance-to-tile'
  | 'advance-to-nearest-railroad'
  | 'advance-to-nearest-utility'
  | 'bank-pays-you'
  | 'pay-bank'
  | 'pay-each-player'
  | 'collect-from-each-player'
  | 'go-to-jail'
  | 'get-out-of-jail-free'
  | 'go-back-3'
  | 'make-repairs'
  | 'pay-poor-tax'
  | 'advance-to-reading-railroad'
  | 'elected-chairman'
  | 'building-loan-matures'
  | 'crossword-competition'
  | 'advance-to-illinois-ave'
  | 'advance-to-st-charles-place'
  | 'bank-error'
  | 'doctors-fee'
  | 'stock-sale'
  | 'holiday-fund'
  | 'income-tax-refund'
  | 'birthday'
  | 'insurance'
  | 'hospital-fees'
  | 'school-fees'
  | 'consultancy-fee'
  | 'street-repairs'
  | 'beauty-contest'
  | 'inherit-money';

export interface MonopolyCard {
  id: string;
  type: CardType;
  title: string;
  description: string;
  action: CardAction;
  value?: number;
  targetTileId?: number;
}

export interface DiceRoll {
  die1: number;
  die2: number;
  isDoubles: boolean;
  total: number;
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  money: number;
  position: number;
  properties: string[];
  inJail: boolean;
  jailTurns: number;
  getOutOfJailCards: number;
  bankrupt: boolean;
  hasRolled: boolean;
  turnOrder: number;
  connected: boolean;
  isHost: boolean;
}

export type PlayerColor =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'purple'
  | 'pink'
  | 'teal';

export interface PropertyTile {
  id: string;
  tileIndex: number;
  name: string;
  type: 'property';
  color: ColorGroup;
  price: number;
  rent: number;
  rentWithOneHouse: number;
  rentWithTwoHouses: number;
  rentWithThreeHouses: number;
  rentWithFourHouses: number;
  rentWithHotel: number;
  houseCost: number;
  mortgageValue: number;
  ownerId: string | null;
  houses: number;
  isHotel: boolean;
  isMortgaged: boolean;
  colorGroupCount: number;
}

export interface RailroadTile {
  id: string;
  tileIndex: number;
  name: string;
  type: 'railroad';
  price: number;
  rent: number[];
  mortgageValue: number;
  ownerId: string | null;
  isMortgaged: boolean;
}

export interface UtilityTile {
  id: string;
  tileIndex: number;
  name: string;
  type: 'utility';
  price: number;
  mortgageValue: number;
  ownerId: string | null;
  isMortgaged: boolean;
}

export interface GoTile {
  id: string;
  tileIndex: number;
  name: string;
  type: 'go';
}

export interface TaxTile {
  id: string;
  tileIndex: number;
  name: string;
  type: 'tax';
  amount: number;
  percentage?: number;
}

export interface JailTile {
  id: string;
  tileIndex: number;
  name: string;
  type: 'jail';
}

export interface GoToJailTile {
  id: string;
  tileIndex: number;
  name: string;
  type: 'go-to-jail';
}

export interface FreeParkingTile {
  id: string;
  tileIndex: number;
  name: string;
  type: 'free-parking';
}

export interface ChanceTile {
  id: string;
  tileIndex: number;
  name: string;
  type: 'chance';
}

export interface CommunityChestTile {
  id: string;
  tileIndex: number;
  name: string;
  type: 'community-chest';
}

export type Tile =
  | PropertyTile
  | RailroadTile
  | UtilityTile
  | GoTile
  | TaxTile
  | JailTile
  | GoToJailTile
  | FreeParkingTile
  | ChanceTile
  | CommunityChestTile;

export type TurnPhase =
  | 'waiting-to-roll'
  | 'rolling'
  | 'moving'
  | 'resolving-tile'
  | 'deciding-buy'
  | 'deciding-tax'
  | 'auction'
  | 'optional-actions'
  | 'rolling-for-jail'
  | 'jail-options'
  | 'end-turn';

export interface AuctionState {
  active: boolean;
  propertyId: string;
  currentBidderId: string | null;
  currentBid: number;
  bidders: string[];
  passedBidders: string[];
  startingBid: number;
}

export interface TradeOffer {
  fromPlayerId: string;
  toPlayerId: string;
  offerProperties: string[];
  offerMoney: number;
  requestProperties: string[];
  requestMoney: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
}

export interface GameSettings {
  startingCash: number;
  maxPlayers: number;
  freeParkingJackpot: boolean;
  doubleMoneyOnGo: boolean;
  noAuctions: boolean;
  auctionType: 'standard' | 'once-around';
  houseLimit: number;
  hotelLimit: number;
  turnTimeout: number;
  allowSpectators: boolean;
}

export interface TurnState {
  playerId: string;
  phase: TurnPhase;
  diceRoll: DiceRoll | null;
  doublesCount: number;
  movesRemaining: number;
  hasBoughtProperty: boolean;
  hasDrawnCard: boolean;
  actionsThisTurn: string[];
  startPosition: number;
  jailRelease: boolean;
}

export interface GameState {
  id: string;
  players: Player[];
  tiles: Tile[];
  chanceDeck: MonopolyCard[];
  communityChestDeck: MonopolyCard[];
  chanceDiscard: MonopolyCard[];
  communityChestDiscard: MonopolyCard[];
  currentTurn: TurnState | null;
  turnOrder: string[];
  turnIndex: number;
  auction: AuctionState | null;
  tradeOffer: TradeOffer | null;
  freeParkingMoney: number;
  housesRemaining: number;
  hotelsRemaining: number;
  settings: GameSettings;
  logs: GameLogEntry[];
  startedAt: number | null;
  endedAt: number | null;
  winnerId: string | null;
  status: GameStatus;
}

export type GameStatus = 'waiting' | 'in-progress' | 'paused' | 'completed';

export interface GameLogEntry {
  id: string;
  timestamp: number;
  type: GameLogType;
  playerId: string | null;
  message: string;
  data?: Record<string, unknown>;
}

export type GameLogType =
  | 'roll'
  | 'move'
  | 'buy'
  | 'auction'
  | 'pay'
  | 'collect'
  | 'card'
  | 'jail'
  | 'build'
  | 'mortgage'
  | 'trade'
  | 'bankrupt'
  | 'eliminate'
  | 'win'
  | 'system';

export interface Lobby {
  id: string;
  code: string;
  hostId: string;
  players: Player[];
  spectators: string[];
  settings: GameSettings;
  status: LobbyStatus;
  createdAt: number;
}

export type LobbyStatus = 'open' | 'in-game' | 'closed';

export interface ServerEventPayloads {
  'lobby:created': { lobbyId: string; code: string };
  'lobby:joined': { lobbyId: string; player: Player };
  'lobby:left': { lobbyId: string; playerId: string };
  'lobby:updated': { lobby: Lobby };
  'lobby:player-ready': { playerId: string; ready: boolean };
  'game:started': { game: GameState };
  'game:state-update': { game: GameState };
  'game:turn-change': { playerId: string; phase: TurnPhase };
  'game:dice-roll': { playerId: string; roll: DiceRoll };
  'game:player-moved': { playerId: string; from: number; to: number };
  'game:property-bought': { playerId: string; propertyId: string };
  'game:auction-started': { auction: AuctionState };
  'game:auction-bid': { playerId: string; amount: number };
  'game:auction-ended': { propertyId: string; winnerId: string | null; amount: number };
  'game:trade-offer': { offer: TradeOffer };
  'game:trade-update': { offer: TradeOffer };
  'game:card-drawn': { playerId: string; card: MonopolyCard };
  'game:jail-update': { playerId: string; inJail: boolean };
  'game:player-bankrupt': { playerId: string };
  'game:player-won': { playerId: string };
  'game:log': { entry: GameLogEntry };
  'chat:message': { playerId: string; message: string; timestamp: number };
  'error': { message: string; code: string };
}

export interface ClientEventPayloads {
  'lobby:create': { settings?: Partial<GameSettings>; playerId: string; playerName?: string; playerColor?: PlayerColor };
  'lobby:join': { code: string; playerName: string; playerColor: PlayerColor; playerId: string };
  'lobby:leave': {};
  'lobby:ready': { ready: boolean };
  'lobby:start-game': {};
  'lobby:update-settings': { settings: Partial<GameSettings> };
  'game:roll-dice': {};
  'game:buy-property': {};
  'game:pay-tax-flat': {};
  'game:pay-tax-percentage': {};
  'game:pass-auction': {};
  'game:auction-bid': { amount: number };
  'game:build-house': { propertyId: string };
  'game:sell-house': { propertyId: string };
  'game:mortgage': { propertyId: string };
  'game:unmortgage': { propertyId: string };
  'game:use-jail-card': {};
  'game:pay-jail-fine': {};
  'game:roll-for-jail': {};
  'game:end-turn': {};
  'game:trade-offer': { offer: Omit<TradeOffer, 'status'> };
  'game:trade-accept': {};
  'game:trade-reject': {};
  'game:trade-cancel': {};
  'game:send-chat': { message: string };
  'game:reconnect': { gameId: string; playerId: string };
}
