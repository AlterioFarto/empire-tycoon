import type {
  GameState, Player, PlayerColor, DiceRoll, PropertyTile, RailroadTile, UtilityTile,
  Tile, GameSettings, MonopolyCard, GameLogEntry,
} from '@monopoly/shared';
import { DEFAULT_SETTINGS, GO_SALARY, GO_DOUBLE_SALARY,
  JAIL_FINE, PROPERTY_SETS, MAX_HOUSES_PER_PROPERTY } from '@monopoly/shared';
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
} from '../property/property.js';
import {
  payJailFine, useJailCard, processJailRoll,
} from '../jail/jail.js';
import {
  createChanceDeck, createCommunityChestDeck, drawCard, resolveCardAction,
} from '../cards/cards.js';
import { createAuction, placeBid, passOnAuction, getAuctionWinner, isAuctionOver } from '../auction/auction.js';
import { createTradeOffer } from '../trade/trade.js';
import {
  createTurnState, setPhase, setDiceRoll, markBoughtProperty, markDrawnCard,
  setStartPosition, hasThirdDouble,
} from '../turn/turn.js';
import { createLogEntry } from '../events/game-events.js';
import { createInitialGameState, updateTileInState, updatePlayerInState } from '../serialization/serialization.js';
import {
  canBuyProperty, canBuildOnProperty, canMortgage,
  hasPlayerWon,
} from '../rules/rules.js';

export interface EngineResult {
  game: GameState;
  events: GameLogEntry[];
}

export interface GameEngine {
  createGame(id: string, settings?: Partial<GameSettings>): GameState;
  addPlayer(game: GameState, id: string, name: string, color: PlayerColor, isHost?: boolean): GameState;
  startGame(game: GameState): GameState;
  rollDice(game: GameState, playerId: string): { game: GameState; roll: DiceRoll };
  handleTileLanding(game: GameState, playerId: string): GameState;
  buyProperty(game: GameState, playerId: string): GameState;
  declineProperty(game: GameState, playerId: string): GameState;
  payRent(game: GameState, playerId: string): GameState;
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
  acceptTrade(game: GameState): GameState;
  rejectTrade(game: GameState): GameState;
  cancelTrade(game: GameState): GameState;
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
    if (!player || !game.currentTurn || game.currentTurn.playerId !== playerId) {
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

    const { newPosition, passedGo } = this.board.calculateMovement(player.position, roll.total);
    let updatedPlayer = player;
    const newLogs: GameLogEntry[] = [];

    if (passedGo) {
      const isLandingOnGo = newPosition === 0;
      const goSalary = (game.settings.doubleMoneyOnGo && isLandingOnGo) ? GO_DOUBLE_SALARY : GO_SALARY;
      updatedPlayer = addMoney(updatedPlayer, goSalary);
      newLogs.push(createLogEntry('collect', playerId, `${player.name} passed GO and collected $${goSalary}.`, { amount: goSalary }));
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

  handleTileLanding(game: GameState, playerId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn) return game;

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
          return this.payRent({ ...game, currentTurn: turn }, playerId);
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
          let updatedPlayer = addMoney(player, jackpot);
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
    if (!player || !game.currentTurn) return game;

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
    if (!player || !game.currentTurn) return game;

    const tile = this.getTileAt(game, player.position);
    if (tile.type !== 'property' && tile.type !== 'railroad' && tile.type !== 'utility') return game;
    if (tile.ownerId) return game;

    if (game.settings.noAuctions) {
      let turn = setPhase(game.currentTurn, 'optional-actions');
      return { ...game, currentTurn: turn };
    }

    return this.startAuction(game, tile.id);
  }

  payRent(game: GameState, playerId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn) return game;

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
        rent = calculateRailroadRent(rrTile, ownedRRs);
        break;
      }
      case 'utility': {
        const utilTile = tile as UtilityTile;
        const ownedUtils = game.tiles.filter(t =>
          t.type === 'utility' && t.ownerId === owner.id
        ).length;
        const roll = game.currentTurn.diceRoll;
        if (!roll) return game;
        rent = calculateUtilityRent(utilTile, ownedUtils, roll);
        break;
      }
    }

    if (rent <= 0) {
      return this.handleTileLanding(game, playerId);
    }

    let actualPaid = Math.min(rent, player.money);
    let updatedPlayer = deductMoney(player, actualPaid);
    let updatedOwner = addMoney(owner, actualPaid);

    const log = createLogEntry('pay', playerId, `${player.name} paid $${actualPaid} rent to ${owner.name}.${actualPaid < rent ? ` Still owes $${rent - actualPaid}.` : ''}`, { amount: actualPaid, ownerId: owner.id });

    if (actualPaid < rent) {
      let gameAfterDebt: GameState = {
        ...game,
        players: updatePlayerInState(
          updatePlayerInState(game.players, updatedPlayer),
          updatedOwner,
        ),
        currentTurn: game.currentTurn,
        logs: [...game.logs, log],
      };
      return this.handleBankruptcy(gameAfterDebt, playerId, owner.id);
    }

    let turn = setPhase(game.currentTurn, 'optional-actions');

    return {
      ...game,
      players: updatePlayerInState(
        updatePlayerInState(game.players, updatedPlayer),
        updatedOwner,
      ),
      currentTurn: turn,
      logs: [...game.logs, log],
    };
  }

  drawCard(game: GameState, playerId: string): { game: GameState; card: MonopolyCard } {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn) {
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
    const newDiscard = [...drawn.deck.discardPile, card];
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

    // Handle collect-from-each-player and pay-each-player
    let updatedPlayers = updatePlayerInState(game.players, resolution.player);
    if (card.action === 'pay-each-player' || card.action === 'elected-chairman') {
      const amount = card.value ?? 50;
      for (const p of game.players) {
        if (p.id !== playerId && !p.bankrupt) {
          updatedPlayers = updatePlayerInState(updatedPlayers, addMoney(p, amount));
        }
      }
    }
    if (card.action === 'collect-from-each-player' || card.action === 'holiday-fund' || card.action === 'birthday') {
      const amount = card.value ?? 50;
      for (const p of game.players) {
        if (p.id !== playerId && !p.bankrupt) {
          updatedPlayers = updatePlayerInState(updatedPlayers, deductMoney(p, amount));
        }
      }
    }

    let turn = markDrawnCard(game.currentTurn);
    turn = setPhase(turn, 'optional-actions');

    // Handle jail cards being kept
    if (card.action === 'get-out-of-jail-free') {
      return {
        game: {
          ...game,
          players: updatedPlayers,
          ...deckUpdate,
          currentTurn: turn,
          logs: [...game.logs, createLogEntry('card', playerId, resolution.log, { card })],
        },
        card,
      };
    }

    const log = createLogEntry('card', playerId, resolution.log, { card });

    // If the card moved the player (advance-to or go-back-3), process the destination tile
    if (resolution.newPosition != null) {
      const movedGame = this.handleTileLanding(
        {
          ...game,
          players: updatedPlayers,
          ...deckUpdate,
          currentTurn: turn,
          logs: [...game.logs, log],
        },
        playerId,
      );
      return { game: movedGame, card };
    }

    return {
      game: {
        ...game,
        players: updatedPlayers,
        ...deckUpdate,
        currentTurn: turn,
        logs: [...game.logs, log],
      },
      card,
    };
  }

  payTax(game: GameState, playerId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn) return game;

    const tile = this.board.getTile(player.position);
    if (tile.type !== 'tax') return game;

    const taxTile = tile as import('@monopoly/shared').TaxTile;

    // Income Tax gives player a choice; Luxury Tax is auto-paid
    if (taxTile.percentage && taxTile.percentage > 0) {
      let turn = setPhase(game.currentTurn, 'deciding-tax');
      return {
        ...game,
        currentTurn: turn,
        logs: [...game.logs, createLogEntry('system', playerId, `${player.name} must choose Income Tax: $${taxTile.amount} or ${taxTile.percentage}%.`, {})],
      };
    }

    let updatedPlayer = deductMoney(player, taxTile.amount);

    if (updatedPlayer.money < 0) {
      updatedPlayer = { ...updatedPlayer, money: 0 };
    }

    let freeParkingMoney = game.freeParkingMoney;
    if (game.settings.freeParkingJackpot) {
      freeParkingMoney += taxTile.amount;
    }

    let turn = setPhase(game.currentTurn, 'optional-actions');

    return {
      ...game,
      players: updatePlayerInState(game.players, updatedPlayer),
      freeParkingMoney,
      currentTurn: turn,
      logs: [...game.logs, createLogEntry('pay', playerId, `${player.name} paid $${taxTile.amount} in taxes.`, { amount: taxTile.amount })],
    };
  }

  payTaxFlat(game: GameState, playerId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn) return game;

    const tile = this.board.getTile(player.position);
    if (tile.type !== 'tax') return game;

    const taxTile = tile as import('@monopoly/shared').TaxTile;
    const taxAmount = taxTile.amount;
    let updatedPlayer = deductMoney(player, taxAmount);
    if (updatedPlayer.money < 0) {
      updatedPlayer = { ...updatedPlayer, money: 0 };
    }

    let freeParkingMoney = game.freeParkingMoney;
    if (game.settings.freeParkingJackpot) {
      freeParkingMoney += taxAmount;
    }

    let turn = setPhase(game.currentTurn, 'optional-actions');

    return {
      ...game,
      players: updatePlayerInState(game.players, updatedPlayer),
      freeParkingMoney,
      currentTurn: turn,
      logs: [...game.logs, createLogEntry('pay', playerId, `${player.name} paid $${taxAmount} flat Income Tax.`, { amount: taxAmount })],
    };
  }

  payTaxPercentage(game: GameState, playerId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn) return game;

    const tile = this.board.getTile(player.position);
    if (tile.type !== 'tax') return game;

    const taxTile = tile as import('@monopoly/shared').TaxTile;
    const percentageAmount = Math.floor(player.money * ((taxTile.percentage ?? 10) / 100));
    let updatedPlayer = deductMoney(player, percentageAmount);
    if (updatedPlayer.money < 0) {
      updatedPlayer = { ...updatedPlayer, money: 0 };
    }

    let freeParkingMoney = game.freeParkingMoney;
    if (game.settings.freeParkingJackpot) {
      freeParkingMoney += percentageAmount;
    }

    let turn = setPhase(game.currentTurn, 'optional-actions');

    return {
      ...game,
      players: updatePlayerInState(game.players, updatedPlayer),
      freeParkingMoney,
      currentTurn: turn,
      logs: [...game.logs, createLogEntry('pay', playerId, `${player.name} paid $${percentageAmount} (${taxTile.percentage}%) Income Tax.`, { amount: percentageAmount })],
    };
  }

  goToJail(game: GameState, playerId: string): GameState {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn) return game;

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
    if (!player || !game.currentTurn) return game;

    const releasedPlayer = payJailFine(player);
    let turn = setPhase(game.currentTurn, 'waiting-to-roll');

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

    const releasedPlayer = useJailCard(player);
    let turn = setPhase(game.currentTurn, 'waiting-to-roll');

    return {
      ...game,
      players: updatePlayerInState(game.players, releasedPlayer),
      currentTurn: turn,
      logs: [...game.logs, createLogEntry('jail', playerId, `${player.name} used a Get Out of Jail Free card.`, {})],
    };
  }

  rollForJail(game: GameState, playerId: string): { game: GameState; roll: DiceRoll } {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !game.currentTurn) {
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
      updatedPlayer = addMoney(updatedPlayer, GO_SALARY);
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

    let updatedTiles = [...game.tiles];
    let updatedHousesRemaining = game.housesRemaining;
    let updatedHotelsRemaining = game.hotelsRemaining;
    let updatedPlayer = deductMoney(player, property.houseCost);
    let logMessage: string;

    if (canBuildHotel(property) && game.hotelsRemaining > 0) {
      const hotel = buildHotel(property);
      updatedTiles = updateTileInState(updatedTiles, hotel);
      updatedHousesRemaining += MAX_HOUSES_PER_PROPERTY; // Return houses
      updatedHotelsRemaining -= 1;
      logMessage = `${player.name} built a hotel on ${property.name}.`;
    } else {
      const house = addHouse(property);
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

    const property = tile as PropertyTile;

    let updatedTiles = [...game.tiles];
    let updatedHousesRemaining = game.housesRemaining;
    let updatedHotelsRemaining = game.hotelsRemaining;
    let refundAmount: number;

    if (property.isHotel) {
      const withoutHotel = sellHotel(property);
      updatedTiles = updateTileInState(updatedTiles, withoutHotel);
      updatedHousesRemaining += MAX_HOUSES_PER_PROPERTY;
      updatedHotelsRemaining += 1;
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

    return {
      ...game,
      auction,
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

    if (isAuctionOver(newAuction)) {
      const { winnerId, amount } = getAuctionWinner(newAuction);
      if (winnerId && amount > 0) {
        const result: GameState = { ...game, auction: { ...newAuction, active: false } };
        const tile = result.tiles.find(t => t.id === newAuction.propertyId);
        if (tile && (tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility')) {
          const ownable = tile as PropertyTile | RailroadTile | UtilityTile;
          const winner = result.players.find(p => p.id === winnerId);
          if (winner && winner.money >= amount) {
            const updatedWinner = addProperty(deductMoney(winner, amount), tile.id);
            return {
              ...result,
              tiles: updateTileInState(result.tiles, { ...ownable, ownerId: winnerId }),
              auction: null,
              players: updatePlayerInState(result.players, updatedWinner),
              logs: [...result.logs, createLogEntry('auction', winnerId, `${winner.name} won ${tile.name} for $${amount}.`, { propertyId: tile.id, amount })],
            } as GameState;
          }
        }
        return result;
      }
      return { ...game, auction: { ...newAuction, active: false } };
    }

    return {
      ...game,
      auction: newAuction,
      logs: [...game.logs, createLogEntry('auction', playerId, `${game.players.find(p => p.id === playerId)?.name ?? 'Player'} passed on auction.`, { playerId })],
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
    const tradeOffer = createTradeOffer(fromId, toId, offer, offerMoney, request, requestMoney);
    return {
      ...game,
      tradeOffer,
      logs: [...game.logs, createLogEntry('trade', fromId, `Trade offered from ${game.players.find(p => p.id === fromId)?.name ?? 'Player'} to ${game.players.find(p => p.id === toId)?.name ?? 'Player'}.`, { tradeOffer })],
    };
  }

  acceptTrade(game: GameState): GameState {
    if (!game.tradeOffer || game.tradeOffer.status !== 'pending') return game;

    const offer = game.tradeOffer;
    let updatedPlayers = [...game.players];
    let updatedTiles = [...game.tiles];

    // Transfer properties from offerer to recipient
    for (const propId of offer.offerProperties) {
      const tileIdx = updatedTiles.findIndex(t => t.id === propId);
      if (tileIdx !== -1) {
        const tile = updatedTiles[tileIdx]!;
        if (tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility') {
          updatedTiles[tileIdx] = { ...tile, ownerId: offer.toPlayerId } as typeof tile;
        }
      }
      const fromPlayer = updatedPlayers.find(p => p.id === offer.fromPlayerId);
      const toPlayer = updatedPlayers.find(p => p.id === offer.toPlayerId);
      if (fromPlayer && toPlayer) {
        updatedPlayers = updatePlayerInState(updatedPlayers, removeProperty(fromPlayer, propId));
        updatedPlayers = updatePlayerInState(updatedPlayers, addProperty(toPlayer, propId));
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
      const fromPlayer = updatedPlayers.find(p => p.id === offer.toPlayerId);
      const toPlayer = updatedPlayers.find(p => p.id === offer.fromPlayerId);
      if (fromPlayer && toPlayer) {
        updatedPlayers = updatePlayerInState(updatedPlayers, removeProperty(fromPlayer, propId));
        updatedPlayers = updatePlayerInState(updatedPlayers, addProperty(toPlayer, propId));
      }
    }

    // Transfer money
    if (offer.offerMoney > 0) {
      const fromPlayer = updatedPlayers.find(p => p.id === offer.fromPlayerId);
      const toPlayer = updatedPlayers.find(p => p.id === offer.toPlayerId);
      if (fromPlayer && toPlayer) {
        const fromUpdated = deductMoney(fromPlayer, offer.offerMoney);
        const toUpdated = addMoney(toPlayer, offer.offerMoney);
        updatedPlayers = updatePlayerInState(
          updatePlayerInState(updatedPlayers, fromUpdated),
          toUpdated,
        );
      }
    }

    if (offer.requestMoney > 0) {
      const fromPlayer = updatedPlayers.find(p => p.id === offer.toPlayerId);
      const toPlayer = updatedPlayers.find(p => p.id === offer.fromPlayerId);
      if (fromPlayer && toPlayer) {
        const fromUpdated = deductMoney(fromPlayer, offer.requestMoney);
        const toUpdated = addMoney(toPlayer, offer.requestMoney);
        updatedPlayers = updatePlayerInState(
          updatePlayerInState(updatedPlayers, fromUpdated),
          toUpdated,
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

  rejectTrade(game: GameState): GameState {
    if (!game.tradeOffer) return game;
    return {
      ...game,
      tradeOffer: null,
      logs: [...game.logs, createLogEntry('trade', game.tradeOffer.toPlayerId, 'Trade rejected.', {})],
    };
  }

  cancelTrade(game: GameState): GameState {
    if (!game.tradeOffer) return game;
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

    let updatedPlayer = setBankrupt(player);
    let updatedTiles = [...game.tiles];
    let updatedPlayers = updatePlayerInState(game.players, { ...updatedPlayer, money: 0, properties: [] });

    // Transfer all properties to creditor (if rent debt) or back to bank
    for (const propId of player.properties) {
      const tileIdx = updatedTiles.findIndex(t => t.id === propId);
      if (tileIdx !== -1) {
        const tile = updatedTiles[tileIdx]!;
        if (tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility') {
          if (creditorId) {
            updatedTiles[tileIdx] = { ...tile, ownerId: creditorId, isMortgaged: tile.isMortgaged } as typeof tile;
            const creditor = updatedPlayers.find(p => p.id === creditorId);
            if (creditor) {
              updatedPlayers = updatePlayerInState(updatedPlayers, addProperty(creditor, propId));
            }
          } else {
            updatedTiles[tileIdx] = { ...tile, ownerId: null, isMortgaged: false } as typeof tile;
          }
        }
      }
    }

    const winner = hasPlayerWon({
      ...game,
      players: updatedPlayers,
    });
    if (winner) {
      return {
        ...game,
        players: updatedPlayers,
        tiles: updatedTiles,
        winnerId: winner,
        status: 'completed',
        endedAt: Date.now(),
        logs: [...game.logs,
          createLogEntry('eliminate', playerId, `${player.name} is bankrupt and eliminated!${creditorId ? ` Properties transferred to ${updatedPlayers.find(p => p.id === creditorId)?.name ?? 'creditor'}.` : ''}`, {}),
          createLogEntry('win', winner, `${updatedPlayers.find(p => p.id === winner)?.name ?? 'Player'} wins!`, {}),
        ],
      };
    }

    return {
      ...game,
      players: updatedPlayers,
      tiles: updatedTiles,
      logs: [...game.logs, createLogEntry('eliminate', playerId, `${player.name} is bankrupt and eliminated!${creditorId ? ` Properties transferred to ${updatedPlayers.find(p => p.id === creditorId)?.name ?? 'creditor'}.` : ''}`, {})],
    };
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
