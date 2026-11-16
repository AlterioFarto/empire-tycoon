import { randomBytes, timingSafeEqual } from 'node:crypto';

const PLAYER_SESSION_TOKENS = new Map<string, string>();

function tokensMatch(expected: string, supplied: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const suppliedBuffer = Buffer.from(supplied, 'utf8');
  if (expectedBuffer.length !== suppliedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export class SessionManager {
  static hasToken(playerId: string): boolean {
    return PLAYER_SESSION_TOKENS.has(playerId);
  }

  static verify(playerId: string, supplied: string | undefined): boolean {
    const expected = PLAYER_SESSION_TOKENS.get(playerId);
    if (!expected) return false;
    if (typeof supplied !== 'string' || supplied.length === 0) return false;
    return tokensMatch(expected, supplied);
  }

  static issue(playerId: string): string {
    const token = randomBytes(32).toString('hex');
    PLAYER_SESSION_TOKENS.set(playerId, token);
    return token;
  }

  static issueForNewPlayer(playerId: string, supplied: string | undefined): { token: string } | null {
    if (SessionManager.hasToken(playerId) && !SessionManager.verify(playerId, supplied)) {
      return null;
    }
    return { token: SessionManager.issue(playerId) };
  }

  static rotate(playerId: string): string {
    return SessionManager.issue(playerId);
  }

  static remove(playerId: string): void {
    PLAYER_SESSION_TOKENS.delete(playerId);
  }
}
