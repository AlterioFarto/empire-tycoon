import type {
  GameState, Player, PlayerColor, DiceRoll, PropertyTile, RailroadTile, UtilityTile,
  Tile, GameSettings, MonopolyCard, GameLogEntry, CardAction,
} from '@monopoly/shared';
import { DEFAULT_SETTINGS, GO_SALARY, GO_DOUBLE_SALARY,
  JAIL_FINE, PROPERTY_SETS, MAX_HOUSES_PER_PROPERTY,
  CHANCE_CARDS, COMMUNITY_CHEST_CARDS } from '@monopoly/shared';
import { RandomDice } from '../dice/dice.js';
import { StandardBoard } from '../board/board.js';
import {
  createPlayer, addMoney, deductMoney, movePlayer, addProperty, removeProperty,
  sendToJail, setBankrupt,
} from '../player/player.js';
import { createBank } from '../bank/bank.js';
import {
  calculatePropertyRent, calculateRailroadRent, calculateUtilityRent,
} from '../rent/rent.js';
import {
  addHouse, buildHotel, canBuildHotel, removeHouse, sellHotel, mortgageProperty, unmortgageProperty,
  isOwnable,
} from '../property/property.js';
import {
  payJailFine, useJailCard as consumeJailCard, processJailRoll,
} from '../jail/jail.js';
import {
  createChanceDeck, createCommunityChestDeck, drawCard, resolveCardAction,
} from '../cards/cards.js';
import { createAuction, placeBid, passOnAuction, getAuctionWinner, isAuctionOver } from '../auction/auction.js';
import { createTradeOffer } from '../trade/trade.js';
import {
  createTurnState, setPhase, setDiceRoll, markBoughtProperty, markDrawnCard,
  setStartPosition, hasThirdDouble, canEndTurn,
} from '../turn/turn.js';
import { createLogEntry } from '../events/game-events.js';
import { createInitialGameState, updateTileInState, updatePlayerInState } from '../serialization/serialization.js';
import {
  canBuyProperty, canBuildOnProperty, canMortgage, canSellBuilding, canTradeProperty,
  hasPlayerWon,
} from '../rules/rules.js';

interface LandingContext {
  cardAction?: CardAction;
}

interface RentContext {
  rentMultiplier?: number;
  utilityRoll?: DiceRoll;
}

interface SettlementResult {
  game: GameState;
  paid: number;
  bankrupt: boolean;
}

export interface EngineResult {
  game: GameState;
  events: GameLogEntry[];
}

export interface GameEngine {
  createGame(id: string, settings?: Partial<GameSettings>): GameState;
  addPlayer(game: GameState, id: string, name: string, color: PlayerColor, isHost?: boolean): GameState;
  startGame(game: GameState): GameState;
  rollDice(game: GameState, playerId: string): { game: GameState; roll: DiceRoll };
  handleTileLanding(game: GameState, playerId: string, context?: LandingContext): GameState;
  buyProperty(game: GameState, playerId: string): GameState;
  declineProperty(game: GameState, playerId: string): GameState;
  payRent(game: GameState, playerId: string, context?: RentContext): GameState;
  drawCard(game: GameState, playerId: string): { game: GameState; card: MonopolyCard };
  payTax(game: GameState, playerId: string): GameState;
  payTaxFlat(game: GameState, playerId: string): GameState;
  payTaxPercentage(game: GameState, playerId: string): GameState;
  goToJail(game: GameState, playerId: string): GameState;
  payJail(game: GameState, playerId: string): GameState;
  useGetOutOfJail(game: GameState, playerId: string): GameState;
  rollForJail(game: GameState, playerId: string): { game: GameState; roll: DiceRoll };
  buildHouse(game: GameState, playerId: string, propertyId: string): GameState;
  sellHouse(game: GameState, playerId: string, propertyId: string): GameState;
  mortgage(game: GameState, playerId: string, propertyId: string): GameState;
  unmortgage(game: GameState, playerId: string, propertyId: string): GameState;
  startAuction(game: GameState, propertyId: string): GameState;
  placeAuctionBid(game: GameState, playerId: string, amount: number): GameState;
  passAuction(game: GameState, playerId: string): GameState;
  createTrade(game: GameState, fromId: string, toId: string, offer: string[], offerMoney: number, request: string[], requestMoney: number): GameState;
  acceptTrade(game: GameState, playerId: string): GameState;
  rejectTrade(game: GameState, playerId: string): GameState;
  cancelTrade(game: GameState, playerId: string): GameState;
  endTurn(game: GameState, playerId: string): GameState;
  getNextPlayer(game: GameState): GameState;
  declareWinner(game: GameState): GameState;
  handleBankruptcy(game: GameState, playerId: string, creditorId?: string): GameState;
  getActivePlayer(game: GameState): Player | undefined;
}

export class MonopolyEngine implements GameEngine {
  private dice: RandomDice;
  private board: StandardBoard;

  constructor() {
    this.dice = new RandomDice();
    this.board = new StandardBoard();
  }

  createGame(id: string, settings?: Partial<GameSettings>): GameState {
    const mergedSettings: GameSettings = { ...DEFAULT_SETTINGS, ...settings };
    const state = createInitialGameState(id, [], mergedSettings);
    return state;
  }

  addPlayer(game: GameState, id: string, name: string, color: PlayerColor, isHost: boolean = false): GameState {
    const player = createPlayer(
      id,
      name,
      color,
      game.settings.startingCash,
      game.players.length,
      isHost,
    );
    return {
      ...game,
      players: [...game.players, player],
    };
  }

  startGame(game: GameState): GameState {
    const chanceDeck = createChanceDeck();
    const communityChestDeck = createCommunityChestDeck();
    const turnOrder = game.players
      .filter(p => !p.bankrupt)
      .sort((a, b) => a.turnOrder - b.turnOrder)
      .map(p => p.id);

    const firstPlayerId = turnOrder[0]!;
    const turnState = createTurnState(firstPlayerId);

    const log = createLogEntry('system', null, 'Game started!');
    const bank = createBank(game.settings);

    return {
      ...game,
      chanceDeck: chanceDeck.cards,
      communityChestDeck: communityChestDeck.cards,
      currentTurn: turnState,
      turnOrder,
      turnIndex: 0,
      housesRemaining: bank.housesRemaining,
      hotelsRemaining: bank.hotelsRemaining,
      status: 'in-progress',
      startedAt: Date.now(),
      logs: [...game.logs, log],
    };
  }

  rollDice(game: GameState, playerId: string): { game: GameState; roll: DiceRoll } {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn || game.currentTurn.playerId !== playerId || game.currentTurn.phase !== 'waiting-to-roll' || player.inJail) {
      return { game, roll: { die1: 0, die2: 0, isDoubles: false, total: 0 } };
    }

    const roll = this.dice.roll();
    let turn = setDiceRoll(game.currentTurn, roll);
    turn = setStartPosition(turn, player.position);

    if (hasThirdDouble(turn)) {
      turn = setPhase(turn, 'resolving-tile');
      const gameWithTurn: GameState = { ...game, currentTurn: turn };
      const updatedGame = this.goToJail(gameWithTurn, playerId);
      return { game: updatedGame, roll };
    }

    const { newPosition, passedGo } = this.board.calculateMovement(player.position, turn.movesRemaining);
    let updatedPlayer = player;
    const newLogs: GameLogEntry[] = [];

    if (passedGo) {
      const isLandingOnGo = newPosition === 0;
      const goSalary = (game.settings.doubleMoneyOnGo && isLandingOnGo) ? GO_DOUBLE_SALARY : GO_SALARY;
      updatedPlayer = addMoney(updatedPlayer, goSalary);
      if (isLandingOnGo) {
        newLogs.push(createLogEntry('collect', playerId, `${player.name} landed on GO and collected $${goSalary}.`, { amount: goSalary }));
      } else {
        newLogs.push(createLogEntry('collect', playerId, `${player.name} passed GO and collected $${goSalary}.`, { amount: goSalary }));
      }
    }

    // Always update the board position, even when passing GO.
    updatedPlayer = movePlayer(updatedPlayer, newPosition);
    turn = setPhase(turn, 'moving');
    newLogs.push(createLogEntry('roll', playerId, `${player.name} rolled ${roll.die1} + ${roll.die2} = ${roll.total}${roll.isDoubles ? ' (doubles!)' : ''}.`, { roll, position: newPosition }));

    return {
      game: {
        ...game,
        players: updatePlayerInState(game.players, updatedPlayer),
        currentTurn: turn,
        logs: [...game.logs, ...newLogs],
      },
      roll,
    };
  }

  private getTileAt(game: GameState, position: number): Tile {
    return game.tiles[position] ?? this.board.getTile(position);
  }

  handleTileLanding(game: GameState, playerId: string, context?: LandingContext): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn || game.currentTurn.playerId !== playerId) return game;

    const tile = this.getTileAt(game, player.position);
    let turn = setPhase(game.currentTurn, 'resolving-tile');

    switch (tile.type) {
      case 'property':
      case 'railroad':
      case 'utility':
        if (!tile.ownerId) {
          turn = setPhase(turn, 'deciding-buy');
          return { ...game, currentTurn: turn };
        }
        if (tile.ownerId !== playerId) {
          const rentContext: RentContext = {};
          if (context?.cardAction === 'advance-to-nearest-railroad') {
            rentContext.rentMultiplier = 2;
          }
          if (context?.cardAction === 'advance-to-nearest-utility') {
            rentContext.utilityRoll = this.dice.roll();
          }
          return this.payRent({ ...game, currentTurn: turn }, playerId, rentContext);
        }
        turn = setPhase(turn, 'optional-actions');
        return { ...game, currentTurn: turn };

      case 'chance':
      case 'community-chest':
        return this.drawCard({ ...game, currentTurn: turn }, playerId).game;

      case 'tax':
        return this.payTax({ ...game, currentTurn: turn }, playerId);

      case 'go-to-jail':
        return this.goToJail({ ...game, currentTurn: turn }, playerId);

      case 'go':
      case 'jail':
      default:
        turn = setPhase(turn, 'optional-actions');
        return { ...game, currentTurn: turn };

      case 'free-parking':
        if (game.settings.freeParkingJackpot && game.freeParkingMoney > 0) {
          const jackpot = game.freeParkingMoney;
          const updatedPlayer = addMoney(player, jackpot);
          const log = createLogEntry('collect', playerId, `${player.name} landed on Free Parking and collected $${jackpot} jackpot!`, { amount: jackpot });
          turn = setPhase(turn, 'optional-actions');
          return {
            ...game,
            players: updatePlayerInState(game.players, updatedPlayer),
            freeParkingMoney: 0,
            currentTurn: turn,
            logs: [...game.logs, log],
          };
        }
        turn = setPhase(turn, 'optional-actions');
        return { ...game, currentTurn: turn };
    }
  }

  buyProperty(game: GameState, playerId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn || game.currentTurn.playerId !== playerId
      || game.currentTurn.phase !== 'deciding-buy') return game;

    const tile = this.getTileAt(game, player.position);
    if (tile.type !== 'property' && tile.type !== 'railroad' && tile.type !== 'utility') return game;
    const ownable = tile as PropertyTile | RailroadTile | UtilityTile;

    const check = canBuyProperty(player, tile, game.settings);
    if (!check.allowed) return game;

    let updatedPlayer = deductMoney(player, ownable.price);
    let updatedTiles = [...game.tiles];

    updatedPlayer = addProperty(updatedPlayer, tile.id);

    switch (tile.type) {
      case 'property': {
        const propTile = tile as PropertyTile;
        updatedTiles = updateTileInState(updatedTiles, { ...propTile, ownerId: playerId });
        break;
      }
      case 'railroad': {
        const rrTile = tile as RailroadTile;
        updatedTiles = updateTileInState(updatedTiles, { ...rrTile, ownerId: playerId });
        break;
      }
      case 'utility': {
        const utilTile = tile as UtilityTile;
        updatedTiles = updateTileInState(updatedTiles, { ...utilTile, ownerId: playerId });
        break;
      }
    }

    let turn = markBoughtProperty(game.currentTurn);
    turn = setPhase(turn, 'optional-actions');

    const log = createLogEntry('buy', playerId, `${player.name} bought ${tile.name} for $${ownable.price}.`, { propertyId: tile.id, price: ownable.price });

    return {
      ...game,
      players: updatePlayerInState(game.players, updatedPlayer),
      tiles: updatedTiles,
      currentTurn: turn,
      logs: [...game.logs, log],
    };
  }

  declineProperty(game: GameState, playerId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn || game.currentTurn.playerId !== playerId
      || game.currentTurn.phase !== 'deciding-buy') return game;

    const tile = this.getTileAt(game, player.position);
    if (tile.type !== 'property' && tile.type !== 'railroad' && tile.type !== 'utility') return game;
    if (tile.ownerId) return game;

    if (game.settings.noAuctions) {
      const turn = setPhase(game.currentTurn, 'optional-actions');
      return { ...game, currentTurn: turn };
    }

    return this.startAuction(game, tile.id);
  }

  private settleDebt(
    game: GameState,
    payerId: string,
    amount: number,
    creditorId?: string,
  ): SettlementResult {
    const payer = game.players.find(p => p.id === payerId);
    if (!payer || amount <= 0) {
      return { game, paid: 0, bankrupt: false };
    }

    const paid = Math.max(0, Math.min(amount, payer.money));
    let players = updatePlayerInState(game.players, deductMoney(payer, paid));
    if (creditorId && paid > 0) {
      const creditor = players.find(p => p.id === creditorId);
      if (creditor) {
        players = updatePlayerInState(players, addMoney(creditor, paid));
      }
    }

    const settledGame: GameState = { ...game, players };
    if (paid < amount) {
      return {
        game: this.handleBankruptcy(settledGame, payerId, creditorId),
        paid,
        bankrupt: true,
      };
    }

    return { game: settledGame, paid, bankrupt: false };
  }

  payRent(game: GameState, playerId: string, context?: RentContext): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn || game.currentTurn.playerId !== playerId) return game;

    const tile = this.getTileAt(game, player.position);
    if (tile.type !== 'property' && tile.type !== 'railroad' && tile.type !== 'utility') return game;
    if (!tile.ownerId || tile.ownerId === playerId) return game;

    const owner = game.players.find(p => p.id === tile.ownerId);
    if (!owner) return game;

    let rent = 0;

    switch (tile.type) {
      case 'property': {
        const propTile = tile as PropertyTile;
        const group = propTile.color;
        const groupProperties = PROPERTY_SETS[group] ?? [];
        const ownedInGroup = groupProperties.filter(id => {
          const t = game.tiles.find(t => t.id === id);
          return t?.type === 'property' && (t as PropertyTile).ownerId === owner.id;
        }).length;
        rent = calculatePropertyRent(propTile, ownedInGroup);
        break;
      }
      case 'railroad': {
        const rrTile = tile as RailroadTile;
        const ownedRRs = game.tiles.filter(t =>
          t.type === 'railroad' && t.ownerId === owner.id
        ).length;
        rent = calculateRailroadRent(rrTile, ownedRRs) * (context?.rentMultiplier ?? 1);
        break;
      }
      case 'utility': {
        const utilTile = tile as UtilityTile;
        const ownedUtils = game.tiles.filter(t =>
          t.type === 'utility' && t.ownerId === owner.id
        ).length;
        const roll = context?.utilityRoll ?? game.currentTurn.diceRoll;
        if (!roll) return game;
        rent = context?.utilityRoll
          ? calculateUtilityRent(utilTile, 2, roll)
          : calculateUtilityRent(utilTile, ownedUtils, roll);
        break;
      }
    }

    if (rent <= 0) {
      const turn = setPhase(game.currentTurn, 'optional-actions');
      return { ...game, currentTurn: turn };
    }

    const settlement = this.settleDebt(game, playerId, rent, owner.id);
    const actualPaid = settlement.paid;
    const log = createLogEntry(
      'pay',
      playerId,
      `${player.name} paid $${actualPaid} rent to ${owner.name}.${actualPaid < rent ? ` Still owes $${rent - actualPaid}.` : ''}`,
      { amount: actualPaid, ownerId: owner.id },
    );
    const settledGame: GameState = {
      ...settlement.game,
      logs: [...settlement.game.logs, log],
    };

    if (settlement.bankrupt) return settledGame;

    return {
      ...settledGame,
      currentTurn: setPhase(settledGame.currentTurn!, 'optional-actions'),
    };
  }

  drawCard(game: GameState, playerId: string): { game: GameState; card: MonopolyCard } {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn || game.currentTurn.playerId !== playerId) {
      return { game, card: {} as MonopolyCard };
    }

    const tile = this.board.getTile(player.position);
    const isChance = tile.type === 'chance';
    const deck = isChance ? game.chanceDeck : game.communityChestDeck;
    const discardSource = isChance ? game.chanceDiscard : game.communityChestDiscard;
    // Recycle the discard pile so the deck never depletes (prevents crash after 16 draws).
    const drawn = drawCard({ cards: deck, discardPile: discardSource });
    const card = drawn.card;
    const newDeckCards = drawn.deck.cards;
    const keepCard = card.action === 'get-out-of-jail-free';
    // A held jail card stays out of the discard pile so recycling cannot duplicate it.
    const newDiscard = keepCard ? drawn.deck.discardPile : [...drawn.deck.discardPile, card];
    const deckUpdate = isChance
      ? { chanceDeck: newDeckCards, chanceDiscard: newDiscard }
      : { communityChestDeck: newDeckCards, communityChestDiscard: newDiscard };

    const propertyTileMap = new Map<number, PropertyTile>();
    for (const t of game.tiles) {
      if (t.type === 'property') {
        propertyTileMap.set(t.tileIndex, t);
      }
    }

    const otherPlayers = game.players.filter(p => p.id !== playerId);
    const resolution = resolveCardAction(card, player, otherPlayers, this.board.getSize(), propertyTileMap);

    const payEach = card.action === 'pay-each-player' || card.action === 'elected-chairman';
    const collectEach = card.action === 'collect-from-each-player'
      || card.action === 'holiday-fund' || card.action === 'birthday';
    const usesSettlement = payEach || collectEach || !!resolution.paidMoney;

    let resolvedPlayer = usesSettlement
      ? { ...resolution.player, money: player.money }
      : resolution.player;
    if (keepCard) {
      resolvedPlayer = {
        ...resolvedPlayer,
        heldJailCardIds: [...(resolvedPlayer.heldJailCardIds ?? []), card.id],
      };
    }

    let workingGame: GameState = {
      ...game,
      players: updatePlayerInState(game.players, resolvedPlayer),
      ...deckUpdate,
    };
    let bankrupt = false;

    if (payEach) {
      const amount = card.value ?? 50;
      const recipients = workingGame.players.filter(p => p.id !== playerId && !p.bankrupt);
      const settlement = this.settleDebt(workingGame, playerId, amount * recipients.length);
      workingGame = settlement.game;
      bankrupt = settlement.bankrupt;
      if (!bankrupt) {
        let players = workingGame.players;
        for (const recipient of recipients) {
          const current = players.find(p => p.id === recipient.id);
          if (current && !current.bankrupt) {
            players = updatePlayerInState(players, addMoney(current, amount));
          }
        }
        workingGame = { ...workingGame, players };
      }
    } else if (collectEach) {
      const amount = card.value ?? 50;
      for (const payer of game.players) {
        if (payer.id === playerId || payer.bankrupt) continue;
        const settlement = this.settleDebt(workingGame, payer.id, amount, playerId);
        workingGame = settlement.game;
        if (settlement.bankrupt) {
          bankrupt = true;
          break;
        }
      }
    } else if (resolution.paidMoney && resolution.paidMoney > 0) {
      const settlement = this.settleDebt(workingGame, playerId, resolution.paidMoney);
      workingGame = settlement.game;
      bankrupt = settlement.bankrupt;
    }

    const log = createLogEntry('card', playerId, resolution.log, { card });
    const loggedGame: GameState = {
      ...workingGame,
      logs: [...workingGame.logs, log],
    };

    if (bankrupt) return { game: loggedGame, card };

    let turn = markDrawnCard(game.currentTurn);
    turn = setPhase(turn, 'optional-actions');

    // A held jail card is already tracked on the player and removed from the deck.
    if (keepCard) {
      return { game: { ...loggedGame, currentTurn: turn }, card };
    }

    // If the card moved the player (advance-to or go-back-3), process the destination tile.
    if (resolution.newPosition != null) {
      const movedGame = this.handleTileLanding(
        { ...loggedGame, currentTurn: turn },
        playerId,
        { cardAction: card.action },
      );
      return { game: movedGame, card };
    }

    return { game: { ...loggedGame, currentTurn: turn }, card };
  }

  payTax(game: GameState, playerId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn || game.currentTurn.playerId !== playerId) return game;

    const tile = this.board.getTile(player.position);
    if (tile.type !== 'tax') return game;

    const taxTile = tile as import('@monopoly/shared').TaxTile;

    // Income Tax gives player a choice; Luxury Tax is auto-paid
    if (taxTile.percentage && taxTile.percentage > 0) {
      const turn = setPhase(game.currentTurn, 'deciding-tax');
      return {
        ...game,
        currentTurn: turn,
        logs: [...game.logs, createLogEntry('system', playerId, `${player.name} must choose Income Tax: $${taxTile.amount} or ${taxTile.percentage}%.`, {})],
      };
    }

    const settlement = this.settleDebt(game, playerId, taxTile.amount);
    const actuallyPaid = settlement.paid;
    const freeParkingMoney = game.freeParkingMoney
      + (game.settings.freeParkingJackpot ? actuallyPaid : 0);
    const log = createLogEntry('pay', playerId, `${player.name} paid $${actuallyPaid} in taxes.`, { amount: actuallyPaid });
    const taxedGame: GameState = {
      ...settlement.game,
      freeParkingMoney,
      logs: [...settlement.game.logs, log],
    };

    if (settlement.bankrupt) return taxedGame;
    return { ...taxedGame, currentTurn: setPhase(taxedGame.currentTurn!, 'optional-actions') };
  }

  payTaxFlat(game: GameState, playerId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn || game.currentTurn.playerId !== playerId
      || game.currentTurn.phase !== 'deciding-tax') return game;

    const tile = this.board.getTile(player.position);
    if (tile.type !== 'tax') return game;

    const taxTile = tile as import('@monopoly/shared').TaxTile;
    const settlement = this.settleDebt(game, playerId, taxTile.amount);
    const freeParkingMoney = game.freeParkingMoney
      + (game.settings.freeParkingJackpot ? settlement.paid : 0);
    const log = createLogEntry('pay', playerId, `${player.name} paid $${settlement.paid} flat Income Tax.`, { amount: settlement.paid });
    const taxedGame: GameState = {
      ...settlement.game,
      freeParkingMoney,
      logs: [...settlement.game.logs, log],
    };

    if (settlement.bankrupt) return taxedGame;
    return { ...taxedGame, currentTurn: setPhase(taxedGame.currentTurn!, 'optional-actions') };
  }

  payTaxPercentage(game: GameState, playerId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn || game.currentTurn.playerId !== playerId
      || game.currentTurn.phase !== 'deciding-tax') return game;

    const tile = this.board.getTile(player.position);
    if (tile.type !== 'tax') return game;

    const taxTile = tile as import('@monopoly/shared').TaxTile;
    const percentageAmount = Math.floor(player.money * ((taxTile.percentage ?? 10) / 100));
    const settlement = this.settleDebt(game, playerId, percentageAmount);
    const freeParkingMoney = game.freeParkingMoney
      + (game.settings.freeParkingJackpot ? settlement.paid : 0);
    const log = createLogEntry('pay', playerId, `${player.name} paid $${settlement.paid} (${taxTile.percentage}%) Income Tax.`, { amount: settlement.paid });
    const taxedGame: GameState = {
      ...settlement.game,
      freeParkingMoney,
      logs: [...settlement.game.logs, log],
    };

    if (settlement.bankrupt) return taxedGame;
    return { ...taxedGame, currentTurn: setPhase(taxedGame.currentTurn!, 'optional-actions') };
  }

  goToJail(game: GameState, playerId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn || game.currentTurn.playerId !== playerId) return game;

    const jailedPlayer = sendToJail(player);

    const log = createLogEntry('jail', playerId, `${player.name} was sent to Jail and their turn ends.`, {});

    const gameWithJail: GameState = {
      ...game,
      players: updatePlayerInState(game.players, jailedPlayer),
      logs: [...game.logs, log],
    };

    // End turn immediately — next player goes
    return this.getNextPlayer(gameWithJail);
  }

  payJail(game: GameState, playerId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn || game.currentTurn.playerId !== playerId) return game;
    if (!player.inJail || game.currentTurn.phase !== 'jail-options' || player.money < JAIL_FINE) return game;

    const releasedPlayer = payJailFine(player);
    const turn = setPhase(game.currentTurn, 'waiting-to-roll');

    return {
      ...game,
      players: updatePlayerInState(game.players, releasedPlayer),
      currentTurn: turn,
      logs: [...game.logs, createLogEntry('jail', playerId, `${player.name} paid $${JAIL_FINE} to get out of Jail.`, {})],
    };
  }

  useGetOutOfJail(game: GameState, playerId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || player.getOutOfJailCards <= 0 || !game.currentTurn) return game;
    if (game.currentTurn.playerId !== playerId) return game;
    if (!player.inJail || game.currentTurn.phase !== 'jail-options') return game;

    const releasedPlayer = consumeJailCard(player);
    const heldCardIds = player.heldJailCardIds ?? [];
    const cardId = heldCardIds[0];
    const returnedCard = cardId
      ? CHANCE_CARDS.find(card => card.id === cardId) ?? COMMUNITY_CHEST_CARDS.find(card => card.id === cardId)
      : undefined;
    const updatedPlayer = { ...releasedPlayer, heldJailCardIds: heldCardIds.slice(1) };
    const turn = setPhase(game.currentTurn, 'waiting-to-roll');

    return {
      ...game,
      players: updatePlayerInState(game.players, updatedPlayer),
      chanceDeck: returnedCard?.type === 'chance' ? [...game.chanceDeck, returnedCard] : game.chanceDeck,
      communityChestDeck: returnedCard?.type === 'community-chest'
        ? [...game.communityChestDeck, returnedCard]
        : game.communityChestDeck,
      currentTurn: turn,
      logs: [...game.logs, createLogEntry('jail', playerId, `${player.name} used a Get Out of Jail Free card.`, {})],
    };
  }

  rollForJail(game: GameState, playerId: string): { game: GameState; roll: DiceRoll } {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn || game.currentTurn.playerId !== playerId) {
      return { game, roll: { die1: 0, die2: 0, isDoubles: false, total: 0 } };
    }

    // A jailed player gets exactly ONE roll attempt per turn. Block re-entry.
    if (game.currentTurn.phase !== 'jail-options' || !player.inJail) {
      return { game, roll: { die1: 0, die2: 0, isDoubles: false, total: 0 } };
    }

    const roll = this.dice.roll();
    const result = processJailRoll(player, roll);

    if (result.action === 'stayed') {
      // One failed attempt consumes this turn — pass to the next player.
      const log = createLogEntry('jail', playerId, `${player.name} stayed in Jail (turn ${result.player.jailTurns}).`, { roll });
      const withLog: GameState = {
        ...game,
        players: updatePlayerInState(game.players, result.player),
        logs: [...game.logs, log],
      };
      return { game: this.getNextPlayer(withLog), roll };
    }

    // Released from jail (rolled doubles) or paid the fine after 3 failed turns.
    const { newPosition, passedGo } = this.board.calculateMovement(player.position, roll.total);
    let updatedPlayer = movePlayer(result.player, newPosition);
    if (passedGo) {
      const isLandingOnGo = newPosition === 0;
      const goSalary = isLandingOnGo && game.settings.doubleMoneyOnGo ? GO_DOUBLE_SALARY : GO_SALARY;
      updatedPlayer = addMoney(updatedPlayer, goSalary);
    }

    // Keep the diceRoll so utility rent can be calculated on the landed tile,
    // but mark jailRelease so endTurn() does NOT grant another roll.
    let turn = setDiceRoll(game.currentTurn, roll);
    turn = { ...turn, jailRelease: true };

    const releaseMessage = result.rolledDoubles
      ? `${player.name} rolled doubles (${roll.die1}+${roll.die2}) and got out of Jail!`
      : `${player.name} failed to roll doubles in 3 turns, paid $${JAIL_FINE} and moved ${roll.total} spaces.`;
    const log = createLogEntry('jail', playerId, releaseMessage, { roll });

    const movedGame: GameState = {
      ...game,
      players: updatePlayerInState(game.players, updatedPlayer),
      currentTurn: turn,
      logs: [...game.logs, log],
    };

    // Resolve the destination tile exactly like a normal move (buy / rent / tax / cards / jail).
    return { game: this.handleTileLanding(movedGame, playerId), roll };
  }

  buildHouse(game: GameState, playerId: string, propertyId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn) return game;

    const tile = game.tiles.find(t => t.id === propertyId);
    if (!tile || tile.type !== 'property') return game;

    const property = tile as PropertyTile;
    const group = property.color;
    const groupProperties = (PROPERTY_SETS[group] ?? [])
      .map(pid => game.tiles.find(t => t.id === pid && t.type === 'property'))
      .filter((t): t is PropertyTile => t !== undefined && t.type === 'property');

    const check = canBuildOnProperty(property, player, groupProperties, game.housesRemaining, game.hotelsRemaining);
    if (!check.allowed) return game;
    if (player.money < property.houseCost) return game;

    let updatedTiles = [...game.tiles];
    let updatedHousesRemaining = game.housesRemaining;
    let updatedHotelsRemaining = game.hotelsRemaining;
    const updatedPlayer = deductMoney(player, property.houseCost);
    let logMessage: string;

    if (canBuildHotel(property, player.money, property.houseCost) && game.hotelsRemaining > 0) {
      const hotel = buildHotel(property, player.money, property.houseCost);
      updatedTiles = updateTileInState(updatedTiles, hotel);
      updatedHousesRemaining += MAX_HOUSES_PER_PROPERTY; // Return houses
      updatedHotelsRemaining -= 1;
      logMessage = `${player.name} built a hotel on ${property.name}.`;
    } else {
      const house = addHouse(property, player.money, property.houseCost);
      updatedTiles = updateTileInState(updatedTiles, house);
      updatedHousesRemaining -= 1;
      logMessage = `${player.name} built a house on ${property.name}.`;
    }

    const log = createLogEntry('build', playerId, logMessage, { propertyId, houseCost: property.houseCost });

    return {
      ...game,
      players: updatePlayerInState(game.players, updatedPlayer),
      tiles: updatedTiles,
      housesRemaining: updatedHousesRemaining,
      hotelsRemaining: updatedHotelsRemaining,
      logs: [...game.logs, log],
    };
  }

  sellHouse(game: GameState, playerId: string, propertyId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn) return game;

    const tile = game.tiles.find(t => t.id === propertyId);
    if (!tile || tile.type !== 'property') return game;
    if (!tile.ownerId || tile.ownerId !== playerId) return game;

    const property = tile as PropertyTile;
    const groupProperties = (PROPERTY_SETS[property.color] ?? [])
      .map(pid => game.tiles.find(t => t.id === pid && t.type === 'property'))
      .filter((t): t is PropertyTile => t !== undefined && t.type === 'property');

    const check = canSellBuilding(property, player, groupProperties);
    if (!check.allowed) return game;

    let updatedTiles = [...game.tiles];
    let updatedHousesRemaining = game.housesRemaining;
    let updatedHotelsRemaining = game.hotelsRemaining;
    let refundAmount: number;

    if (property.isHotel) {
      // Downgrading a hotel must take four houses back out of the bank.
      if (updatedHousesRemaining < MAX_HOUSES_PER_PROPERTY) return game;
      const withoutHotel = sellHotel(property);
      updatedTiles = updateTileInState(updatedTiles, withoutHotel);
      updatedHotelsRemaining += 1;
      updatedHousesRemaining -= MAX_HOUSES_PER_PROPERTY;
      refundAmount = Math.floor((property.houseCost * (MAX_HOUSES_PER_PROPERTY + 1)) / 2);
    } else if (property.houses > 0) {
      const withLessHouses = removeHouse(property);
      updatedTiles = updateTileInState(updatedTiles, withLessHouses);
      updatedHousesRemaining += 1;
      refundAmount = Math.floor(property.houseCost / 2);
    } else {
      return game;
    }

    const updatedPlayer = addMoney(player, refundAmount);
    const log = createLogEntry('build', playerId, `${player.name} sold a building on ${property.name} for $${refundAmount}.`, { propertyId, refund: refundAmount });

    return {
      ...game,
      players: updatePlayerInState(game.players, updatedPlayer),
      tiles: updatedTiles,
      housesRemaining: updatedHousesRemaining,
      hotelsRemaining: updatedHotelsRemaining,
      logs: [...game.logs, log],
    };
  }

  mortgage(game: GameState, playerId: string, propertyId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player) return game;

    const tile = game.tiles.find(t => t.id === propertyId);
    if (!tile) return game;
    if (tile.type !== 'property' && tile.type !== 'railroad' && tile.type !== 'utility') return game;
    if (!tile.ownerId || tile.ownerId !== playerId) return game;

    const check = canMortgage(tile as PropertyTile | RailroadTile | UtilityTile, []);
    if (!check.allowed) return game;

    const ownable = tile as PropertyTile | RailroadTile | UtilityTile;
    const mortgaged = mortgageProperty(ownable);
    const updatedPlayer = addMoney(player, mortgaged.mortgageValue);

    const log = createLogEntry('mortgage', playerId, `${player.name} mortgaged ${tile.name} for $${mortgaged.mortgageValue}.`, { propertyId, value: mortgaged.mortgageValue });

    return {
      ...game,
      players: updatePlayerInState(game.players, updatedPlayer),
      tiles: updateTileInState(game.tiles, mortgaged),
      logs: [...game.logs, log],
    };
  }

  unmortgage(game: GameState, playerId: string, propertyId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player) return game;

    const tile = game.tiles.find(t => t.id === propertyId);
    if (!tile) return game;
    if (tile.type !== 'property' && tile.type !== 'railroad' && tile.type !== 'utility') return game;

    const ownable = tile as PropertyTile | RailroadTile | UtilityTile;
    if (!ownable.isMortgaged) return game;
    if (!ownable.ownerId || ownable.ownerId !== playerId) return game;

    const cost = Math.ceil(ownable.mortgageValue * 1.1);
    if (player.money < cost) return game;

    const updatedPlayer = deductMoney(player, cost);
    const unmortgaged = unmortgageProperty(ownable);

    const log = createLogEntry('mortgage', playerId, `${player.name} unmortgaged ${tile.name} for $${cost}.`, { propertyId, cost });

    return {
      ...game,
      players: updatePlayerInState(game.players, updatedPlayer),
      tiles: updateTileInState(game.tiles, unmortgaged),
      logs: [...game.logs, log],
    };
  }

  startAuction(game: GameState, propertyId: string): GameState {
    const activePlayers = game.players.filter(p => !p.bankrupt).map(p => p.id);
    const auction = createAuction(propertyId, activePlayers);
    const turn = game.currentTurn ? setPhase(game.currentTurn, 'auction') : null;

    return {
      ...game,
      auction,
      currentTurn: turn,
      logs: [...game.logs, createLogEntry('auction', null, `Auction started for ${game.tiles.find(t => t.id === propertyId)?.name ?? 'property'}.`, { propertyId })],
    };
  }

  placeAuctionBid(game: GameState, playerId: string, amount: number): GameState {
    if (!game.auction || !game.auction.active) return game;

    const newAuction = placeBid(game.auction, playerId, amount);
    if (!newAuction) return game;

    return {
      ...game,
      auction: newAuction,
      logs: [...game.logs, createLogEntry('auction', playerId, `${game.players.find(p => p.id === playerId)?.name ?? 'Player'} bid $${amount}.`, { playerId, amount })],
    };
  }

  passAuction(game: GameState, playerId: string): GameState {
    if (!game.auction || !game.auction.active) return game;

    const newAuction = passOnAuction(game.auction, playerId);
    const passLog = createLogEntry('auction', playerId, `${game.players.find(p => p.id === playerId)?.name ?? 'Player'} passed on auction.`, { playerId });

    if (isAuctionOver(newAuction)) {
      const { winnerId, amount } = getAuctionWinner(newAuction);
      const turn = game.currentTurn ? setPhase(game.currentTurn, 'optional-actions') : null;
      const result: GameState = {
        ...game,
        auction: null,
        currentTurn: turn,
        logs: [...game.logs, passLog],
      };
      if (winnerId && amount > 0) {
        const tile = result.tiles.find(t => t.id === newAuction.propertyId);
        if (tile && isOwnable(tile)) {
          const winner = result.players.find(p => p.id === winnerId);
          if (winner && winner.money >= amount) {
            const updatedWinner = addProperty(deductMoney(winner, amount), tile.id);
            return {
              ...result,
              tiles: updateTileInState(result.tiles, { ...tile, ownerId: winnerId }),
              players: updatePlayerInState(result.players, updatedWinner),
              logs: [...result.logs, createLogEntry('auction', winnerId, `${winner.name} won ${tile.name} for $${amount}.`, { propertyId: tile.id, amount })],
            };
          }
        }
      }
      return result;
    }

    return {
      ...game,
      auction: newAuction,
      logs: [...game.logs, passLog],
    };
  }

  createTrade(
    game: GameState,
    fromId: string,
    toId: string,
    offer: string[],
    offerMoney: number,
    request: string[],
    requestMoney: number,
  ): GameState {
    if (fromId === toId) return game;
    if (!game.players.some(p => p.id === fromId) || !game.players.some(p => p.id === toId)) return game;
    const tradeOffer = createTradeOffer(fromId, toId, offer, offerMoney, request, requestMoney);
    return {
      ...game,
      tradeOffer,
      logs: [...game.logs, createLogEntry('trade', fromId, `Trade offered from ${game.players.find(p => p.id === fromId)?.name ?? 'Player'} to ${game.players.find(p => p.id === toId)?.name ?? 'Player'}.`, { tradeOffer })],
    };
  }

  acceptTrade(game: GameState, playerId: string): GameState {
    if (!game.tradeOffer || game.tradeOffer.status !== 'pending') return game;
    if (game.tradeOffer.toPlayerId !== playerId) return game;

    const offer = game.tradeOffer;
    let updatedPlayers = [...game.players];
    const updatedTiles = [...game.tiles];
    const fromPlayer = updatedPlayers.find(p => p.id === offer.fromPlayerId);
    const toPlayer = updatedPlayers.find(p => p.id === offer.toPlayerId);
    if (!fromPlayer || !toPlayer) return game;

    // Validate ownership, buildings, and funds
    if (!offer.offerProperties.every(propId => {
      const tile = updatedTiles.find(t => t.id === propId);
      return tile !== undefined && isOwnable(tile) && tile.ownerId === offer.fromPlayerId
        && canTradeProperty(tile, fromPlayer).allowed;
    })) return game;
    if (!offer.requestProperties.every(propId => {
      const tile = updatedTiles.find(t => t.id === propId);
      return tile !== undefined && isOwnable(tile) && tile.ownerId === offer.toPlayerId
        && canTradeProperty(tile, toPlayer).allowed;
    })) return game;
    if (fromPlayer.money < offer.offerMoney) return game;
    if (toPlayer.money < offer.requestMoney) return game;

    // Transfer properties from offerer to recipient
    for (const propId of offer.offerProperties) {
      const tileIdx = updatedTiles.findIndex(t => t.id === propId);
      if (tileIdx !== -1) {
        const tile = updatedTiles[tileIdx]!;
        if (tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility') {
          updatedTiles[tileIdx] = { ...tile, ownerId: offer.toPlayerId } as typeof tile;
        }
      }
      const sender = updatedPlayers.find(p => p.id === offer.fromPlayerId);
      const receiver = updatedPlayers.find(p => p.id === offer.toPlayerId);
      if (sender && receiver) {
        updatedPlayers = updatePlayerInState(updatedPlayers, removeProperty(sender, propId));
        updatedPlayers = updatePlayerInState(updatedPlayers, addProperty(receiver, propId));
      }
    }

    // Transfer properties from recipient to offerer
    for (const propId of offer.requestProperties) {
      const tileIdx = updatedTiles.findIndex(t => t.id === propId);
      if (tileIdx !== -1) {
        const tile = updatedTiles[tileIdx]!;
        if (tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility') {
          updatedTiles[tileIdx] = { ...tile, ownerId: offer.fromPlayerId } as typeof tile;
        }
      }
      const sender = updatedPlayers.find(p => p.id === offer.toPlayerId);
      const receiver = updatedPlayers.find(p => p.id === offer.fromPlayerId);
      if (sender && receiver) {
        updatedPlayers = updatePlayerInState(updatedPlayers, removeProperty(sender, propId));
        updatedPlayers = updatePlayerInState(updatedPlayers, addProperty(receiver, propId));
      }
    }

    // Transfer money
    if (offer.offerMoney > 0) {
      const payer = updatedPlayers.find(p => p.id === offer.fromPlayerId);
      const payee = updatedPlayers.find(p => p.id === offer.toPlayerId);
      if (payer && payee && payer.money >= offer.offerMoney) {
        updatedPlayers = updatePlayerInState(
          updatePlayerInState(updatedPlayers, deductMoney(payer, offer.offerMoney)),
          addMoney(payee, offer.offerMoney),
        );
      }
    }

    if (offer.requestMoney > 0) {
      const payer = updatedPlayers.find(p => p.id === offer.toPlayerId);
      const payee = updatedPlayers.find(p => p.id === offer.fromPlayerId);
      if (payer && payee && payer.money >= offer.requestMoney) {
        updatedPlayers = updatePlayerInState(
          updatePlayerInState(updatedPlayers, deductMoney(payer, offer.requestMoney)),
          addMoney(payee, offer.requestMoney),
        );
      }
    }

    return {
      ...game,
      players: updatedPlayers,
      tiles: updatedTiles,
      tradeOffer: null,
      logs: [...game.logs, createLogEntry('trade', offer.fromPlayerId, 'Trade accepted.', {})],
    };
  }

  rejectTrade(game: GameState, playerId: string): GameState {
    if (!game.tradeOffer || game.tradeOffer.toPlayerId !== playerId) return game;
    return {
      ...game,
      tradeOffer: null,
      logs: [...game.logs, createLogEntry('trade', game.tradeOffer.toPlayerId, 'Trade rejected.', {})],
    };
  }

  cancelTrade(game: GameState, playerId: string): GameState {
    if (!game.tradeOffer || game.tradeOffer.fromPlayerId !== playerId) return game;
    return {
      ...game,
      tradeOffer: null,
      logs: [...game.logs, createLogEntry('trade', game.tradeOffer.fromPlayerId, 'Trade cancelled.', {})],
    };
  }

  endTurn(game: GameState, playerId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn || game.currentTurn.playerId !== playerId) return game;

    const turn = game.currentTurn;
    if (!canEndTurn(turn)) return game;

    // If rolled doubles (and not the third double, and not released from jail) go again
    if (turn.diceRoll?.isDoubles && turn.doublesCount < 3 && !player.inJail && !turn.jailRelease) {
      return {
        ...game,
        currentTurn: setPhase(turn, 'waiting-to-roll'),
      };
    }

    return this.getNextPlayer(game);
  }

  getNextPlayer(game: GameState): GameState {
    const activePlayers = game.players.filter(p => !p.bankrupt);
    if (activePlayers.length <= 1) {
      return this.declareWinner(game);
    }

    const currentIndex = game.turnIndex;
    const turnOrder = game.turnOrder;
    let nextIndex = (currentIndex + 1) % turnOrder.length;

    // Skip bankrupt players
    let attempts = 0;
    while (attempts < turnOrder.length) {
      const nextPlayerId = turnOrder[nextIndex]!;
      const nextPlayer = game.players.find(p => p.id === nextPlayerId);
      if (nextPlayer && !nextPlayer.bankrupt) {
        break;
      }
      nextIndex = (nextIndex + 1) % turnOrder.length;
      attempts++;
    }

    const nextPlayerId = turnOrder[nextIndex]!;
    const nextPlayer = game.players.find(p => p.id === nextPlayerId);
    if (!nextPlayer || nextPlayer.bankrupt) {
      return this.declareWinner(game);
    }

    const newTurn = createTurnState(nextPlayerId);

    if (nextPlayer.inJail) {
      return {
        ...game,
        currentTurn: setPhase(newTurn, 'jail-options'),
        turnIndex: nextIndex,
      };
    }

    return {
      ...game,
      currentTurn: newTurn,
      turnIndex: nextIndex,
    };
  }

  handleBankruptcy(game: GameState, playerId: string, creditorId?: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player) return game;

    const updatedPlayer = setBankrupt(player);
    const updatedTiles = [...game.tiles];
    let updatedPlayers = updatePlayerInState(game.players, { ...updatedPlayer, money: 0, properties: [] });
    let updatedHousesRemaining = game.housesRemaining;
    let updatedHotelsRemaining = game.hotelsRemaining;

    // Buildings are sold back to the bank before properties are transferred.
    for (const propId of player.properties) {
      const tileIdx = updatedTiles.findIndex(t => t.id === propId);
      if (tileIdx !== -1) {
        const tile = updatedTiles[tileIdx]!;
        if (!isOwnable(tile)) continue;

        let cleanTile = tile;
        if (tile.type === 'property') {
          if (tile.isHotel) {
            updatedHotelsRemaining += 1;
            cleanTile = { ...tile, houses: 0, isHotel: false };
          } else if (tile.houses > 0) {
            updatedHousesRemaining += tile.houses;
            cleanTile = { ...tile, houses: 0 };
          }
        }

        if (creditorId) {
          updatedTiles[tileIdx] = { ...cleanTile, ownerId: creditorId } as typeof tile;
          const creditor = updatedPlayers.find(p => p.id === creditorId);
          if (creditor) {
            updatedPlayers = updatePlayerInState(updatedPlayers, addProperty(creditor, propId));
          }
        } else {
          updatedTiles[tileIdx] = { ...cleanTile, ownerId: null, isMortgaged: false } as typeof tile;
        }
      }
    }

    const creditedName = creditorId
      ? updatedPlayers.find(p => p.id === creditorId)?.name ?? 'creditor'
      : '';
    const eliminationMessage = `${player.name} is bankrupt and eliminated!${creditorId ? ` Properties transferred to ${creditedName}.` : ''}`;
    const winner = hasPlayerWon({
      ...game,
      players: updatedPlayers,
    });
    const result: GameState = winner
      ? {
          ...game,
          players: updatedPlayers,
          tiles: updatedTiles,
          housesRemaining: updatedHousesRemaining,
          hotelsRemaining: updatedHotelsRemaining,
          winnerId: winner,
          status: 'completed',
          endedAt: Date.now(),
          logs: [...game.logs,
            createLogEntry('eliminate', playerId, eliminationMessage, {}),
            createLogEntry('win', winner, `${updatedPlayers.find(p => p.id === winner)?.name ?? 'Player'} wins!`, {}),
          ],
        }
      : {
          ...game,
          players: updatedPlayers,
          tiles: updatedTiles,
          housesRemaining: updatedHousesRemaining,
          hotelsRemaining: updatedHotelsRemaining,
          logs: [...game.logs, createLogEntry('eliminate', playerId, eliminationMessage, {})],
        };

    return winner ? result : this.getNextPlayer(result);
  }

  declareWinner(game: GameState): GameState {
    const winner = game.players.find(p => !p.bankrupt);
    if (!winner) return game;

    return {
      ...game,
      winnerId: winner.id,
      status: 'completed',
      endedAt: Date.now(),
      logs: [...game.logs, createLogEntry('win', winner.id, `${winner.name} wins the game!`, {})],
    };
  }

  getActivePlayer(game: GameState): Player | undefined {
    if (!game.currentTurn) return undefined;
    return game.players.find(p => p.id === (game.currentTurn as NonNullable<GameState['currentTurn']>).playerId);
  }
}
