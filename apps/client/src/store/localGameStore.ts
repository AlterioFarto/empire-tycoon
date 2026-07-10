import { create } from 'zustand';
import type { GameState, GameSettings, PlayerColor, DiceRoll, MonopolyCard, PropertyTile, RailroadTile, UtilityTile } from '@monopoly/shared';
import { MonopolyEngine, setPhase } from '@monopoly/game-engine';

const engine = new MonopolyEngine();

interface LocalPlayerSetup {
  id: string;
  name: string;
  color: PlayerColor;
}

type ModalType = 'property-detail' | 'card' | 'game-log' | 'manage-properties' | 'trade' | 'settings' | null;

interface AnimationState {
  isRolling: boolean;
  isMoving: boolean;
  moveFrom: number;
  moveTo: number;
  movePlayerId: string | null;
}

interface LocalGameStore {
  // Setup phase
  phase: 'setup' | 'playing' | 'finished';
  players: LocalPlayerSetup[];
  settings: GameSettings;
  addPlayer: (name: string, color: PlayerColor) => boolean;
  removePlayer: (id: string) => void;
  updateSettings: (patch: Partial<GameSettings>) => void;
  startGame: () => void;

  // Playing phase
  game: GameState | null;
  lastRoll: DiceRoll | null;

  // UI state
  activeModal: ModalType;
  modalData: Record<string, unknown>;
  lastDrawnCard: MonopolyCard | null;
  openModal: (modal: ModalType, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Animation state
  animation: AnimationState;
  setAnimation: (patch: Partial<AnimationState>) => void;

  // Actions (passthrough to engine)
  rollDice: () => void;
  buyProperty: () => void;
  passAuction: () => void;
  auctionBid: (amount: number) => void;
  buildHouse: (propertyId: string) => void;
  sellHouse: (propertyId: string) => void;
  mortgage: (propertyId: string) => void;
  unmortgage: (propertyId: string) => void;
  payJailFine: () => void;
  useJailCard: () => void;
  rollForJail: () => void;
  endTurn: () => void;
  handleTileLanding: () => void;

  // Trade actions
  createTrade: (
    toId: string,
    offerProps: string[],
    offerMoney: number,
    requestProps: string[],
    requestMoney: number,
  ) => void;
  acceptTrade: () => void;
  rejectTrade: () => void;
  cancelTrade: () => void;

  // Chat (local only – simple log)
  chatMessages: { playerId: string; message: string; timestamp: number }[];
  sendChat: (message: string) => void;

  reset: () => void;
}

let playerCounter = 0;

export const useLocalGameStore = create<LocalGameStore>((set, get) => ({
  phase: 'setup',
  players: [],
  settings: {
    startingCash: 1500,
    maxPlayers: 8,
    freeParkingJackpot: false,
    doubleMoneyOnGo: false,
    noAuctions: false,
    auctionType: 'standard',
    houseLimit: 32,
    hotelLimit: 12,
    turnTimeout: 60000,
    allowSpectators: false,
  },
  game: null,
  lastRoll: null,

  // UI state
  activeModal: null,
  modalData: {},
  lastDrawnCard: null,
  openModal: (modal, data = {}) => set({ activeModal: modal, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: {} }),

  // Animation state
  animation: {
    isRolling: false,
    isMoving: false,
    moveFrom: 0,
    moveTo: 0,
    movePlayerId: null,
  },
  setAnimation: (patch) => set((s) => ({ animation: { ...s.animation, ...patch } })),

  chatMessages: [],

  addPlayer: (name, color) => {
    const state = get();
    if (state.players.length >= 8) return false;
    if (state.players.some((p) => p.color === color)) return false;
    playerCounter++;
    set({
      players: [...state.players, { id: `local-${playerCounter}`, name, color }],
    });
    return true;
  },

  removePlayer: (id) => {
    set((s) => ({ players: s.players.filter((p) => p.id !== id) }));
  },

  updateSettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, ...patch } }));
  },

  startGame: () => {
    const state = get();
    if (state.players.length < 2) return;

    let game = engine.createGame('local-game', state.settings);
    for (const p of state.players) {
      game = engine.addPlayer(game, p.id, p.name, p.color, p.id === state.players[0]!.id);
    }
    game = engine.startGame(game);

    set({ phase: 'playing', game });
  },

  // ── Game actions ──

  rollDice: () => {
    const state = get();
    if (!state.game?.currentTurn) return;
    const playerId = state.game.currentTurn.playerId;
    const player = state.game.players.find(p => p.id === playerId);
    if (!player) return;

    const startPos = player.position;

    // Start dice rolling animation
    set({ animation: { ...state.animation, isRolling: true } });

    // After dice animation, resolve roll and start movement
    setTimeout(() => {
      const s = get();
      if (!s.game?.currentTurn) return;

      // Engine rollDice: moves player, handles GO salary, doubles → jail
      const { game: rolledGame, roll } = engine.rollDice(s.game, playerId);
      const playerAfterRoll = rolledGame.players.find(p => p.id === playerId);
      let drawnCard: MonopolyCard | null = null;

      if (!playerAfterRoll || playerAfterRoll.inJail) {
        // Jail — no movement animation needed
        set({
          animation: { isRolling: false, isMoving: false, moveFrom: 0, moveTo: 0, movePlayerId: null },
          game: rolledGame,
          lastRoll: roll,
        });
        return;
      }

      const endPos = playerAfterRoll.position;

      if (startPos === endPos) {
        // No movement (e.g. rolled in jail and stayed) — resolve immediately
        const resolved = engine.handleTileLanding(rolledGame, playerId);
        const latestLog = resolved.logs[resolved.logs.length - 1];
        if (latestLog?.type === 'card' && latestLog.data?.card) {
          drawnCard = latestLog.data.card as MonopolyCard;
        }
        set({
          animation: { isRolling: false, isMoving: false, moveFrom: 0, moveTo: 0, movePlayerId: null },
          game: resolved,
          lastRoll: roll,
          lastDrawnCard: drawnCard,
        });
        return;
      }

      // Show dice result + start movement animation
      // Game state NOT updated yet — AnimatedToken handles the visual
      set({
        lastRoll: roll,
        animation: { isRolling: false, isMoving: true, moveFrom: startPos, moveTo: endPos, movePlayerId: playerId },
      });

      // After movement animation, resolve tile at the NEW position
      setTimeout(() => {
        const s2 = get();
        if (!s2.game?.currentTurn) return;

        // Resolve tile landing at the position rollDice moved the player to
        let resolved = engine.handleTileLanding(rolledGame, playerId);

        // Check if a card was drawn (look at latest log)
        const latestLog = resolved.logs[resolved.logs.length - 1];
        if (latestLog?.type === 'card' && latestLog.data?.card) {
          drawnCard = latestLog.data.card as MonopolyCard;
        }

        // Stop movement animation and update game state
        set({
          animation: { isRolling: false, isMoving: false, moveFrom: 0, moveTo: 0, movePlayerId: null },
          game: resolved,
          lastDrawnCard: drawnCard,
        });

        // Auto-show property detail when landing on any property
        const landedPlayer = resolved.players.find(p => p.id === playerId);
        if (landedPlayer) {
          const landedTile = resolved.tiles[landedPlayer.position];
          if (landedTile && (landedTile.type === 'property' || landedTile.type === 'railroad' || landedTile.type === 'utility')) {
            setTimeout(() => {
              get().openModal('property-detail', { tileId: landedTile.id, tileIndex: landedTile.tileIndex });
            }, 300);
          }
        }
      }, 600);
    }, 500);
  },

  handleTileLanding: () => {
    const state = get();
    if (!state.game?.currentTurn) return;
    const game = engine.handleTileLanding(state.game, state.game.currentTurn.playerId);
    set({ game });
  },

  buyProperty: () => {
    const state = get();
    if (!state.game?.currentTurn) return;
    const game = engine.buyProperty(state.game, state.game.currentTurn.playerId);
    set({ game });
  },

  passAuction: () => {
    const state = get();
    if (!state.game?.currentTurn) return;
    // Skip auction entirely in local mode — treat noAuctions as true
    const gameWithNoAuction = {
      ...state.game,
      settings: { ...state.game.settings, noAuctions: true },
    };
    const game = engine.declineProperty(gameWithNoAuction, state.game.currentTurn.playerId);
    set({ game });
  },

  auctionBid: (amount) => {
    const state = get();
    if (!state.game) return;
    const activeBidders = state.game.auction?.bidders ?? [];
    // Find next bidder after current
    const game = engine.placeAuctionBid(state.game, activeBidders[0] ?? '', amount);
    set({ game });
  },

  buildHouse: (propertyId) => {
    const state = get();
    if (!state.game?.currentTurn) return;
    const game = engine.buildHouse(state.game, state.game.currentTurn.playerId, propertyId);
    set({ game });
  },

  sellHouse: (propertyId) => {
    const state = get();
    if (!state.game?.currentTurn) return;
    const game = engine.sellHouse(state.game, state.game.currentTurn.playerId, propertyId);
    set({ game });
  },

  mortgage: (propertyId) => {
    const state = get();
    if (!state.game?.currentTurn) return;
    const game = engine.mortgage(state.game, state.game.currentTurn.playerId, propertyId);
    set({ game });
  },

  unmortgage: (propertyId) => {
    const state = get();
    if (!state.game?.currentTurn) return;
    const game = engine.unmortgage(state.game, state.game.currentTurn.playerId, propertyId);
    set({ game });
  },

  payJailFine: () => {
    const state = get();
    if (!state.game?.currentTurn) return;
    const game = engine.payJail(state.game, state.game.currentTurn.playerId);
    set({ game });
  },

  useJailCard: () => {
    const state = get();
    if (!state.game?.currentTurn) return;
    const game = engine.useGetOutOfJail(state.game, state.game.currentTurn.playerId);
    set({ game });
  },

  rollForJail: () => {
    const state = get();
    if (!state.game?.currentTurn) return;
    const { game, roll } = engine.rollForJail(state.game, state.game.currentTurn.playerId);

    // A jail roll may move the player onto a card tile; surface it for the card modal.
    const latestLog = game.logs[game.logs.length - 1];
    const drawnCard = latestLog?.type === 'card' && latestLog.data?.card
      ? (latestLog.data.card as MonopolyCard)
      : null;

    set({ game, lastRoll: roll, lastDrawnCard: drawnCard });
  },

  endTurn: () => {
    const state = get();
    if (!state.game?.currentTurn) return;
    const game = engine.endTurn(state.game, state.game.currentTurn.playerId);
    set({ game, lastRoll: null, lastDrawnCard: null });
  },

  createTrade: (toId, offerProps, offerMoney, requestProps, requestMoney) => {
    const state = get();
    if (!state.game?.currentTurn) return;
    const game = engine.createTrade(
      state.game,
      state.game.currentTurn.playerId,
      toId,
      offerProps,
      offerMoney,
      requestProps,
      requestMoney,
    );
    set({ game });
  },

  acceptTrade: () => {
    const state = get();
    if (!state.game) return;
    const game = engine.acceptTrade(state.game);
    set({ game });
  },

  rejectTrade: () => {
    const state = get();
    if (!state.game) return;
    const game = engine.rejectTrade(state.game);
    set({ game });
  },

  cancelTrade: () => {
    const state = get();
    if (!state.game) return;
    const game = engine.cancelTrade(state.game);
    set({ game });
  },

  sendChat: (message) => {
    const state = get();
    const currentPlayerId = state.game?.currentTurn?.playerId ?? 'system';
    set({
      chatMessages: [
        ...state.chatMessages,
        { playerId: currentPlayerId, message, timestamp: Date.now() },
      ],
    });
  },

  reset: () => {
    playerCounter = 0;
    set({
      phase: 'setup',
      players: [],
      game: null,
      lastRoll: null,
      activeModal: null,
      modalData: {},
      lastDrawnCard: null,
      animation: { isRolling: false, isMoving: false, moveFrom: 0, moveTo: 0, movePlayerId: null },
      chatMessages: [],
    });
  },
}));
