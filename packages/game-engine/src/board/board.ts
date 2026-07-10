import { getStandardBoard, BOARD_SIZE, GO_TILE, JAIL_TILE, GO_TO_JAIL_TILE } from '@monopoly/shared';
import type { Tile, PropertyTile, RailroadTile, UtilityTile } from '@monopoly/shared';

export interface BoardProvider {
  getTile(index: number): Tile;
  getTiles(): Tile[];
  getSize(): number;
  getProperty(id: string): PropertyTile | undefined;
  getRailroad(id: string): RailroadTile | undefined;
  getUtility(id: string): UtilityTile | undefined;
  getPropertyByIndex(index: number): PropertyTile | undefined;
  getRailroadByIndex(index: number): RailroadTile | undefined;
  getUtilityByIndex(index: number): UtilityTile | undefined;
  calculateMovement(from: number, steps: number): { newPosition: number; passedGo: boolean };
  getDistanceToNearestRailroad(from: number): number;
  getDistanceToNearestUtility(from: number): number;
}

export class StandardBoard implements BoardProvider {
  private tiles: Tile[];

  constructor() {
    this.tiles = getStandardBoard();
  }

  getTile(index: number): Tile {
    const tile = this.tiles[normalizeIndex(index)];
    if (!tile) throw new Error(`Tile at index ${index} not found`);
    return tile;
  }

  getTiles(): Tile[] {
    return this.tiles;
  }

  getSize(): number {
    return BOARD_SIZE;
  }

  getProperty(id: string): PropertyTile | undefined {
    const tile = this.tiles.find(t => t.id === id);
    return tile?.type === 'property' ? (tile as PropertyTile) : undefined;
  }

  getRailroad(id: string): RailroadTile | undefined {
    const tile = this.tiles.find(t => t.id === id);
    return tile?.type === 'railroad' ? (tile as RailroadTile) : undefined;
  }

  getUtility(id: string): UtilityTile | undefined {
    const tile = this.tiles.find(t => t.id === id);
    return tile?.type === 'utility' ? (tile as UtilityTile) : undefined;
  }

  getPropertyByIndex(index: number): PropertyTile | undefined {
    const tile = this.tiles[normalizeIndex(index)];
    return tile?.type === 'property' ? (tile as PropertyTile) : undefined;
  }

  getRailroadByIndex(index: number): RailroadTile | undefined {
    const tile = this.tiles[normalizeIndex(index)];
    return tile?.type === 'railroad' ? (tile as RailroadTile) : undefined;
  }

  getUtilityByIndex(index: number): UtilityTile | undefined {
    const tile = this.tiles[normalizeIndex(index)];
    return tile?.type === 'utility' ? (tile as UtilityTile) : undefined;
  }

  calculateMovement(from: number, steps: number): { newPosition: number; passedGo: boolean } {
    const newPosition = (from + steps) % BOARD_SIZE;
    const passedGo = newPosition < from || (from + steps >= BOARD_SIZE);
    return { newPosition, passedGo };
  }

  getDistanceToNearestRailroad(from: number): number {
    const railroadIndices = [5, 15, 25, 35];
    let minDistance = BOARD_SIZE;
    for (const idx of railroadIndices) {
      let distance = (idx - from + BOARD_SIZE) % BOARD_SIZE;
      if (distance === 0) distance = BOARD_SIZE;
      if (distance < minDistance) minDistance = distance;
    }
    return minDistance;
  }

  getDistanceToNearestUtility(from: number): number {
    const utilityIndices = [12, 28];
    let minDistance = BOARD_SIZE;
    for (const idx of utilityIndices) {
      let distance = (idx - from + BOARD_SIZE) % BOARD_SIZE;
      if (distance === 0) distance = BOARD_SIZE;
      if (distance < minDistance) minDistance = distance;
    }
    return minDistance;
  }
}

function normalizeIndex(index: number): number {
  return ((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
}

export function passedGo(from: number, to: number): boolean {
  return to < from;
}

export function isGoTile(index: number): boolean {
  return index === GO_TILE;
}

export function isJailTile(index: number): boolean {
  return index === JAIL_TILE;
}

export function isGoToJailTile(index: number): boolean {
  return index === GO_TO_JAIL_TILE;
}
