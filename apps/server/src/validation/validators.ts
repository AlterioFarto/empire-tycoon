import type { GameState, PlayerColor } from '@monopoly/shared';
import { ALLOWED_COLORS } from '@monopoly/shared';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOBBY_CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const PROPERTY_ID_RE = /^[a-z0-9-]+$/i; // permissive, existence check is stronger

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

export function isValidPlayerColor(v: unknown): v is PlayerColor {
  return typeof v === 'string' && ALLOWED_COLORS.has(v as PlayerColor);
}

export function isValidPlayerName(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const t = v.trim();
  return t.length >= 1 && t.length <= 16;
}

export function isValidLobbyCode(v: unknown): v is string {
  return typeof v === 'string' && LOBBY_CODE_RE.test(v.toUpperCase());
}

export function isValidAmount(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v) && v > 0;
}

export function isValidMoney(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v) && v >= 0 && v <= 1_000_000;
}

export function isValidPropertyId(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= 64 && PROPERTY_ID_RE.test(v);
}

export function propertyExists(game: GameState, propertyId: string): boolean {
  return game.tiles.some(t => (t as { id?: string }).id === propertyId);
}

export function validateSettings(input: unknown): { valid: boolean; error?: string; value?: Record<string, unknown> } {
  if (input === undefined) return { valid: true, value: {} };
  if (input === null || !isObject(input)) return { valid: false, error: 'settings must be an object' };
  const out: Record<string, unknown> = {};
  // startingCash 500-5000
  if ('startingCash' in input) {
    const v = input.startingCash;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 500 || v > 5000) return { valid: false, error: 'startingCash must be integer 500-5000' };
    out.startingCash = v;
  }
  if ('maxPlayers' in input) {
    const v = input.maxPlayers;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 2 || v > 8) return { valid: false, error: 'maxPlayers must be integer 2-8' };
    out.maxPlayers = v;
  }
  if ('freeParkingJackpot' in input) {
    if (typeof input.freeParkingJackpot !== 'boolean') return { valid: false, error: 'freeParkingJackpot must be boolean' };
    out.freeParkingJackpot = input.freeParkingJackpot;
  }
  if ('doubleMoneyOnGo' in input) {
    if (typeof input.doubleMoneyOnGo !== 'boolean') return { valid: false, error: 'doubleMoneyOnGo must be boolean' };
    out.doubleMoneyOnGo = input.doubleMoneyOnGo;
  }
  if ('noAuctions' in input) {
    if (typeof input.noAuctions !== 'boolean') return { valid: false, error: 'noAuctions must be boolean' };
    out.noAuctions = input.noAuctions;
  }
  if ('auctionType' in input) {
    if (input.auctionType !== 'standard' && input.auctionType !== 'once-around') return { valid: false, error: 'auctionType must be standard or once-around' };
    out.auctionType = input.auctionType;
  }
  if ('houseLimit' in input) {
    const v = input.houseLimit;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 32) return { valid: false, error: 'houseLimit must be integer 0-32' };
    out.houseLimit = v;
  }
  if ('hotelLimit' in input) {
    const v = input.hotelLimit;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 12) return { valid: false, error: 'hotelLimit must be integer 0-12' };
    out.hotelLimit = v;
  }
  if ('turnTimeout' in input) {
    const v = input.turnTimeout;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 10000 || v > 300000) return { valid: false, error: 'turnTimeout must be integer 10000-300000' };
    out.turnTimeout = v;
  }
  if ('allowSpectators' in input) {
    if (typeof input.allowSpectators !== 'boolean') return { valid: false, error: 'allowSpectators must be boolean' };
    out.allowSpectators = input.allowSpectators;
  }
  // reject unknown keys? allow but ignore
  const allowed = new Set(['startingCash','maxPlayers','freeParkingJackpot','doubleMoneyOnGo','noAuctions','auctionType','houseLimit','hotelLimit','turnTimeout','allowSpectators']);
  for (const k of Object.keys(input)) if (!allowed.has(k)) return { valid: false, error: `unknown settings key: ${k}` };
  return { valid: true, value: out };
}

export function validateTradeOffer(offer: unknown, game: GameState): { valid: boolean; error?: string } {
  if (!isObject(offer)) return { valid: false, error: 'offer must be object' };
  const { toPlayerId, offerProperties, offerMoney, requestProperties, requestMoney } = offer as Record<string, unknown>;
  if (!isUuid(toPlayerId)) return { valid: false, error: 'toPlayerId must be UUID' };
  if (!Array.isArray(offerProperties) || !offerProperties.every(isValidPropertyId)) return { valid: false, error: 'offerProperties must be array of propertyIds' };
  if (!Array.isArray(requestProperties) || !requestProperties.every(isValidPropertyId)) return { valid: false, error: 'requestProperties must be array of propertyIds' };
  if (!isValidMoney(offerMoney)) return { valid: false, error: 'offerMoney must be integer 0-1000000' };
  if (!isValidMoney(requestMoney)) return { valid: false, error: 'requestMoney must be integer 0-1000000' };
  if (offerProperties.length > 28 || requestProperties.length > 28) return { valid: false, error: 'too many properties in trade' };
  // existence check if game provided
  for (const pid of [...offerProperties, ...requestProperties] as string[]) {
    if (!propertyExists(game, pid)) return { valid: false, error: `property not found: ${pid}` };
  }
  // prevent duplicate ids across offer/request
  const seen = new Set<string>();
  for (const id of [...offerProperties, ...requestProperties] as string[]) {
    if (seen.has(id)) return { valid: false, error: `duplicate property in trade: ${id}` };
    seen.add(id);
  }
  if (!game.players.some(p => p.id === toPlayerId)) return { valid: false, error: 'toPlayer not in game' };
  return { valid: true };
}

export function validateChatMessage(v: unknown): { valid: boolean; error?: string } {
  if (!isObject(v)) return { valid: false, error: 'message payload must be object' };
  const msg = (v as Record<string, unknown>).message;
  if (typeof msg !== 'string') return { valid: false, error: 'message must be string' };
  const t = msg.trim();
  if (t.length === 0 || t.length > 500) return { valid: false, error: 'message must be 1-500 chars' };
  return { valid: true };
}
