import { motion } from 'framer-motion';
import type { Tile, Player, PropertyTile, RailroadTile, UtilityTile } from '@monopoly/shared';

interface BoardProps {
  tiles: Tile[];
  players: Player[];
  currentPlayerId: string | null;
  onTileClick?: (tileId: string, tileIndex: number) => void;
  animation?: {
    isMoving: boolean;
    moveFrom: number;
    moveTo: number;
    movePlayerId: string | null;
  };
}

const COLOR_MAP: Record<string, string> = {
  brown: '#8B4513',
  'light-blue': '#87CEEB',
  pink: '#FF69B4',
  orange: '#FF8C00',
  red: '#DC143C',
  yellow: '#FFD700',
  green: '#228B22',
  'dark-blue': '#00008B',
};

// Rich, high-end modern color gradients for a beautiful tactile property card appearance
const COLOR_GRADIENTS: Record<string, string[]> = {
  brown: ['#5c2e0b', '#8B4513', '#a35c24'],
  'light-blue': ['#2563eb', '#38bdf8', '#bae6fd'],
  pink: ['#be185d', '#ec4899', '#fbcfe8'],
  orange: ['#c2410c', '#f97316', '#ffedd5'],
  red: ['#b91c1c', '#ef4444', '#fee2e2'],
  yellow: ['#a16207', '#eab308', '#fef9c3'],
  green: ['#15803d', '#22c55e', '#dcfce7'],
  'dark-blue': ['#1e3a8a', '#3b82f6', '#dbeafe'],
};

const PLAYER_COLORS: Record<string, string> = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#22C55E',
  yellow: '#EAB308',
  orange: '#F97316',
  purple: '#A855F7',
  pink: '#EC4899',
  teal: '#14B8A6',
};

// 13×13 grid: corners span 2 cells, side tiles span 1 cell
const GRID = 13;
const C = 2;
const S = 1;

const pct = (n: number) => (n / GRID) * 100;

// Precompute layout for all 40 tiles
const LAYOUT: { x: number; y: number; w: number; h: number }[] = [];

// Bottom row: 0-10
for (let i = 0; i <= 10; i++) {
  if (i === 0) {
    LAYOUT.push({ x: 11, y: 11, w: 2, h: 2 });
  } else if (i === 10) {
    LAYOUT.push({ x: 0, y: 11, w: 2, h: 2 });
  } else {
    LAYOUT.push({
      x: 11 - i,
      y: 11,
      w: 1,
      h: 2,
    });
  }
}

// Right edge becomes left
for (let i = 11; i <= 19; i++) {
  const idx = i - 11;
  LAYOUT.push({ x: 0, y: GRID - C - S - idx, w: C, h: S });
}

// Top row: 20-30
for (let i = 20; i <= 30; i++) {
  if (i === 20) {
    LAYOUT.push({ x: 0, y: 0, w: 2, h: 2 });
  } else if (i === 30) {
    LAYOUT.push({ x: 11, y: 0, w: 2, h: 2 });
  } else {
    LAYOUT.push({
      x: i - 19,
      y: 0,
      w: 1,
      h: 2,
    });
  }
}

// Left edge becomes right
for (let i = 31; i <= 39; i++) {
  const idx = i - 31;
  LAYOUT.push({ x: GRID - C, y: C + idx, w: C, h: S });
}

function l(index: number) {
  const p = LAYOUT[index]!;
  return {
    left: `${pct(p.x)}%`,
    top: `${pct(p.y)}%`,
    width: `${pct(p.w)}%`,
    height: `${pct(p.h)}%`,
  };
}

function isCorner(i: number) { return i === 0 || i === 10 || i === 20 || i === 30; }

function edgeOfBoard(i: number): 'bottom' | 'left' | 'top' | 'right' | null {
  if (i >= 1 && i <= 9) return 'bottom';
  if (i >= 11 && i <= 19) return 'left';
  if (i >= 21 && i <= 29) return 'top';
  if (i >= 31 && i <= 39) return 'right';
  return null;
}

function hasOwner(tile: Tile): tile is PropertyTile | RailroadTile | UtilityTile {
  return tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility';
}

const CORNER_STYLES: Record<number, React.CSSProperties> = {
  0: { background: 'radial-gradient(circle at center, #065f46 0%, #044e39 100%)', color: '#fff' },
  10: { background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)', color: '#d1d5db' },
  20: { background: 'radial-gradient(circle at center, #0f766e 0%, #115e59 100%)', color: '#ccfbf1' },
  30: { background: 'radial-gradient(circle at center, #991b1b 0%, #7f1d1d 100%)', color: '#fca5a5' },
};

const SPECIAL_ICONS: Record<string, string> = {
  chance: '?',
  'community-chest': '✉',
};

const SPECIAL_BG: Record<string, string> = {
  chance: '#fef3c7',
  'community-chest': '#e0e7ff',
};

const SPECIAL_ICON_BG: Record<string, string> = {
  chance: '#f59e0b',
  'community-chest': '#6366f1',
};

export function Board({ tiles, players, currentPlayerId, onTileClick, animation }: BoardProps) {
  const activePlayer = players.find((p) => p.id === currentPlayerId);

  return (
    <div
      className="relative w-full max-w-[700px] aspect-square overflow-hidden p-[1%] select-none rounded-[16px] border-[5px] border-[#3a2c1f]"
      style={{
        background: 'radial-gradient(circle at center, #1e1b18 0%, #0f0c0a 100%)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), inset 0 0 100px rgba(0,0,0,0.6)',
      }}
    >
      {/* Wooden Table Inlay Border */}
      <div 
        className="absolute inset-[0.5%] rounded-[12px] pointer-events-none"
        style={{
          border: '2px solid rgba(212, 175, 55, 0.25)', // Gold foil trim
          boxShadow: 'inset 0 0 15px rgba(0,0,0,0.5)',
        }}
      />

      {/* Main Board Surface */}
      <div
        className="absolute inset-[1.5%] overflow-hidden rounded-[8px]"
        style={{
          backgroundColor: '#faf6ec', // Premium clean warm ivory linen
          backgroundImage: `
            radial-gradient(rgba(0,0,0,0.03) 1px, transparent 0),
            radial-gradient(rgba(0,0,0,0.02) 2px, transparent 0)
          `,
          backgroundSize: '4px 4px, 8px 8px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        }}
      >
        {/* Fine gold board grid layout details */}
        <div className="absolute inset-0 border-[3px] border-[#cbb893] opacity-35 pointer-events-none rounded-[6px]" />

        {/* Center area with wood inlay & cards */}
        <div
          className="absolute flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden"
          style={{
            left: `${pct(C)}%`,
            top: `${pct(C)}%`,
            width: `${pct(GRID - C * 2)}%`,
            height: `${pct(GRID - C * 2)}%`,
            background: 'radial-gradient(ellipse at center, #f5efe0 0%, #e8dcc4 100%)',
            border: '2px dashed rgba(184, 168, 138, 0.6)',
            boxShadow: 'inset 0 0 35px rgba(120, 100, 80, 0.15)',
          }}
        >
          {/* Subtle Golden Geometric Line Inlays */}
          <div className="absolute inset-[6%] border border-[#d2c29d] opacity-50 pointer-events-none" />
          <div className="absolute inset-[8%] border border-[#d2c29d] opacity-30 rotate-45 pointer-events-none" />

          {/* Luxury Wood Banner Header */}
          <div className="relative z-10 text-center px-4 py-2 mt-[-5%] mb-4 max-w-[90%]">
            <h1
              className="font-serif font-black tracking-[0.25em] text-[#1a1c23] drop-shadow-md uppercase"
              style={{
                fontSize: 'clamp(18px, 4.5vw, 42px)',
                background: 'linear-gradient(135deg, #2c1d11 0%, #000000 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              EMPIRE TYCOON
            </h1>
            <div className="h-[2px] w-[60%] mx-auto bg-gradient-to-r from-transparent via-[#bfa46f] to-transparent my-1" />
            <div
              className="text-[10px] font-semibold tracking-widest text-[#7c6244] uppercase"
              style={{ fontSize: 'clamp(7px, 1.2vw, 11px)' }}
            >
              The Luxury Monopoly Experience
            </div>
          </div>

          {/* Cards Decks visual presentation */}
          <div className="flex gap-12 mt-2 w-full justify-center px-6">
            {/* Chance Deck Slot */}
            <div className="relative w-[75px] aspect-[2.5/3.5] rounded-md border border-[#dbb26b] bg-gradient-to-br from-[#b45309] to-[#78350f] shadow-lg flex flex-col items-center justify-center -rotate-12 pointer-events-auto cursor-help opacity-90 hover:opacity-100 transition-all hover:-translate-y-1">
              <div className="absolute inset-1 border border-[rgba(255,255,255,0.25)] rounded-[4px] flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-amber-100 drop-shadow">?</span>
                <span className="text-[7px] font-semibold text-amber-200 uppercase tracking-widest mt-1">CHANCE</span>
              </div>
              <div className="absolute bottom-1 right-1 text-[8px] text-[rgba(255,255,255,0.15)]">★</div>
            </div>

            {/* Community Chest Deck Slot */}
            <div className="relative w-[75px] aspect-[2.5/3.5] rounded-md border border-[#7bb3ff] bg-gradient-to-br from-[#1e40af] to-[#0f172a] shadow-lg flex flex-col items-center justify-center rotate-12 pointer-events-auto cursor-help opacity-90 hover:opacity-100 transition-all hover:-translate-y-1">
              <div className="absolute inset-1 border border-[rgba(255,255,255,0.25)] rounded-[4px] flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-indigo-100 drop-shadow">✉</span>
                <span className="text-[6.5px] font-semibold text-indigo-200 uppercase tracking-widest mt-1.5">CHEST</span>
              </div>
              <div className="absolute bottom-1 left-1 text-[8px] text-[rgba(255,255,255,0.15)]">★</div>
            </div>
          </div>

          {/* Current Action Display Banner */}
          {activePlayer && (
            <div className="mt-8 px-4 py-1.5 rounded-full bg-[#1e293b] border border-[#d2c29d]/30 text-white shadow-md flex items-center gap-2 max-w-[85%]">
              <div 
                className="w-2.5 h-2.5 rounded-full animate-ping"
                style={{ backgroundColor: PLAYER_COLORS[activePlayer.color] }}
              />
              <span className="text-[9.5px] tracking-wide font-medium text-gray-200">
                Turn: <strong style={{ color: PLAYER_COLORS[activePlayer.color] }}>{activePlayer.name}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Tiles */}
        {tiles.map((tile, index) => {
          const tilePlayers = players.filter(
            (p) => p.position === index && !p.bankrupt && !(animation?.isMoving && p.id === animation.movePlayerId),
          );
          return (
            <TileView
              key={tile.id}
              tile={tile}
              index={index}
              tilePlayers={tilePlayers}
              allPlayers={players}
              activePlayerId={currentPlayerId}
              onClick={onTileClick}
            />
          );
        })}

        {/* Animated token overlay */}
        {animation?.isMoving && animation.movePlayerId && (
          <AnimatedToken
            playerId={animation.movePlayerId}
            fromPosition={animation.moveFrom}
            toPosition={animation.moveTo}
            players={players}
          />
        )}
      </div>
    </div>
  );
}

function TileView({
  tile,
  index,
  tilePlayers,
  allPlayers,
  activePlayerId,
  onClick,
}: {
  tile: Tile;
  index: number;
  tilePlayers: Player[];
  allPlayers: Player[];
  activePlayerId: string | null;
  onClick?: (tileId: string, tileIndex: number) => void;
}) {
  const corner = isCorner(index);
  const colorBar = !corner ? getColor(tile) : null;
  const colorGrad = !corner ? getColorGradient(tile) : null;
  const price = !corner ? getPrice(tile) : null;
  const special = !corner && (tile.type === 'chance' || tile.type === 'community-chest');
  const isClickable = !corner && (hasOwner(tile) || special || tile.type === 'tax');

  const ownable = hasOwner(tile) ? tile : null;
  const ownerId = ownable?.ownerId ?? null;
  const ownerP = ownerId ? allPlayers.find((p) => p.id === ownerId) : undefined;
  const ownerColor = ownerP ? PLAYER_COLORS[ownerP.color] : null;

  // Render a highlight if a player with current turn is active on this space
  const currentActivePlayerObj = allPlayers.find((p) => p.id === activePlayerId);
  const isCurrentPlayerOnThisTile = currentActivePlayerObj?.position === index;

  const containerStyle: React.CSSProperties = {
    ...l(index),
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: corner ? '4px' : '0px',
    border: isCurrentPlayerOnThisTile
      ? '2.5px solid #fbbf24'
      : corner
        ? '1px solid rgba(139, 90, 43, 0.3)'
        : '1.5px solid rgba(139, 90, 43, 0.15)',
    boxShadow: isCurrentPlayerOnThisTile
      ? '0 0 16px rgba(251,191,36,0.65), inset 0 0 8px rgba(251,191,36,0.2)'
      : 'inset 0 1px 1px rgba(255,255,255,0.6)',
    zIndex: isCurrentPlayerOnThisTile ? 10 : 2,
    transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s, border-color 0.18s',
    cursor: isClickable ? 'pointer' : 'default',
  };

  const handleClick = isClickable
    ? () => onClick?.(tile.id, tile.tileIndex)
    : undefined;

  // Corner tiles layout
  if (corner) {
    const cs = CORNER_STYLES[index] ?? {};
    return (
      <motion.div
        whileHover={{ scale: 1.02, zIndex: 12 }}
        style={{ ...containerStyle, ...cs, justifyContent: 'center', alignItems: 'center' }}
        onClick={handleClick}
      >
        {/* GO */}
        {index === 0 && (
          <div className="flex flex-col items-center justify-center leading-none text-center p-1.5 h-full w-full relative">
            <div className="absolute inset-1.5 border border-[rgba(255,255,255,0.15)] rounded" />
            <div className="text-[10px] tracking-widest text-[#a7f3d0] font-bold uppercase mb-0.5">Collect $200</div>
            <div className="font-extrabold tracking-wide text-white flex items-center justify-center" style={{ fontSize: 'clamp(18px, 4vw, 32px)', textShadow: '2px 3px 6px rgba(0,0,0,0.4)' }}>
              GO
            </div>
            {/* Massive Arrow */}
            <div className="absolute bottom-2 font-black text-emerald-300 animate-pulse text-lg">➔</div>
          </div>
        )}

        {/* JAIL */}
        {index === 10 && (
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-100 p-1">
            <div className="absolute inset-1 border border-slate-700 rounded" />
            {/* Split Jail Corner representation: In Jail vs Just Visiting */}
            <div className="absolute inset-x-0 bottom-0 top-[35%] bg-slate-900 border-t border-slate-700 flex flex-col items-center justify-center">
              {/* Bars illustration */}
              <div className="absolute inset-0 opacity-20 flex justify-around px-2 pointer-events-none">
                <div className="w-1 bg-white h-full" />
                <div className="w-1 bg-white h-full" />
                <div className="w-1 bg-white h-full" />
              </div>
              <span className="font-black tracking-widest text-red-500 uppercase mt-0.5" style={{ fontSize: 'clamp(6.5px, 1.2vw, 11px)', textShadow: '1px 1px 3px black' }}>
                IN JAIL
              </span>
            </div>
            <div className="absolute top-1 text-center">
              <span className="text-[6.5px] uppercase font-bold tracking-wider text-slate-400">JUST VISITING</span>
            </div>
          </div>
        )}

        {/* FREE PARKING */}
        {index === 20 && (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-1">
            <div className="absolute inset-1 border border-[rgba(255,255,255,0.15)] rounded" />
            {/* Golden luxury car graphic */}
            <svg className="w-6 h-6 text-yellow-300 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 10l1.5-4.5h11L19 10H5z"/>
            </svg>
            <span className="font-bold tracking-wider text-center text-[#e2fef9] mt-1 uppercase" style={{ fontSize: 'clamp(6px,1vw,10px)', textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
              FREE PARK
            </span>
          </div>
        )}

        {/* GO TO JAIL */}
        {index === 30 && (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-1 text-center bg-red-950">
            <div className="absolute inset-1 border border-[rgba(255,255,255,0.15)] rounded" />
            {/* Siren / Badge Icon */}
            <svg className="w-6 h-6 text-red-400 drop-shadow animate-bounce" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4zm0 11a3 3 0 110-6 3 3 0 010 6z" />
            </svg>
            <div className="font-black tracking-widest text-[#fee2e2] mt-1 leading-tight uppercase" style={{ fontSize: 'clamp(6px,0.9vw,10px)', textShadow: '1px 1px 3px black' }}>
              <div>GO TO</div>
              <div className="text-red-400">JAIL</div>
            </div>
          </div>
        )}

        {/* Tokens inside corner */}
        <PlayerTokensList players={tilePlayers} activePlayerId={activePlayerId} />
      </motion.div>
    );
  }

  // Regular side tiles
  const edge = edgeOfBoard(index);
  const textRotation = edge === 'left' ? 90 : edge === 'top' ? 180 : edge === 'right' ? 270 : 0;

  // Glossy color bar setup mimicking commercial board game properties
const colorBarStyle: React.CSSProperties =
  edge === 'bottom'
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '22%',
        background: colorGrad
          ? `linear-gradient(to right, ${colorGrad[0]}, ${colorGrad[1]})`
          : colorBar ?? undefined,
      }
    : edge === 'top'
    ? {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '22%',
        background: colorGrad
          ? `linear-gradient(to right, ${colorGrad[0]}, ${colorGrad[1]})`
          : colorBar ?? undefined,
      }
    : edge === 'left'
    ? {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '22%',
        background: colorGrad
          ? `linear-gradient(to bottom, ${colorGrad[0]}, ${colorGrad[1]})`
          : colorBar ?? undefined,
      }
    : {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '22%',
        background: colorGrad
          ? `linear-gradient(to bottom, ${colorGrad[0]}, ${colorGrad[1]})`
          : colorBar ?? undefined,
      };
	  
  // Determine property states (houses, hotels, mortgage status)
  const isProperty = tile.type === 'property';
  const pTile = isProperty ? (tile as PropertyTile) : null;
  const housesCount = pTile?.houses ?? 0;
  const isHotel = pTile?.isHotel ?? false;
  const isMortgaged = (tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility') 
    ? (tile as PropertyTile | RailroadTile | UtilityTile).isMortgaged 
    : false;

  return (
    <motion.div
      whileHover={{ scale: 1.05, zIndex: 12, boxShadow: '0 8px 16px rgba(0,0,0,0.25)' }}
      style={containerStyle}
      onClick={handleClick}
      className="bg-[#faf6ec] group relative"
    >
      {/* Property color bar */}
      {colorBar && (
        <div style={colorBarStyle} className="relative flex items-center justify-center">
          {/* Miniature 3D House / Hotel representation inside the color bar! */}
          {isProperty && !isMortgaged && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {isHotel ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1.2 }} className="flex items-center">
                  <div className="relative w-5 h-5 drop-shadow-lg" style={{ color: '#dc2626' }}>
                    <svg className="w-full h-full text-red-600 fill-current" viewBox="0 0 24 24">
                      <path d="M19 13V4H5v9H3v7h18v-7h-2zm-6 5h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V8h2v2z" />
                    </svg>
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  </div>
                </motion.div>
              ) : (
                housesCount > 0 && (
                  <div
                    className="flex gap-0.5 justify-center items-center"
                    style={{ transform: `rotate(${textRotation}deg)` }}
                  >
                    {Array.from({ length: housesCount }).map((_, hIdx) => (
                      <motion.div key={hIdx} initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-green-100">
                        <svg className="w-2.5 h-2.5 drop-shadow text-green-600 fill-current" viewBox="0 0 24 24">
                          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                        </svg>
                      </motion.div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Specialty graphical background patterns */}
      {special && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: SPECIAL_BG[tile.type] ?? '#fcf9f2', opacity: 0.15 }}
        />
      )}

      {/* Ownership metallic bar at the inner edge */}
      {ownerColor && (
        <div
          className="absolute shadow-sm"
          style={{
            left: edge === 'left' ? 'auto' : 0,
            right: edge === 'right' ? 'auto' : 0,
            bottom: edge === 'bottom' ? 'auto' : 0,
            top: edge === 'top' ? 'auto' : 0,
            width: (edge === 'left' || edge === 'right') ? '4px' : '100%',
            height: (edge === 'left' || edge === 'right') ? '100%' : '4px',
            backgroundColor: ownerColor,
            boxShadow: `0 0 6px ${ownerColor}`,
          }}
        />
      )}

      {/* Main tile content body */}
      <div
        className="flex-1 flex flex-col items-center justify-center text-center overflow-hidden h-full w-full relative"
        style={{
          padding: '2px 4px',
          transform: textRotation ? `rotate(${textRotation}deg)` : undefined,
          minWidth: 0,
          minHeight: 0,
        }}
      >
        {/* Render beautiful custom vector icons for non-street properties */}
        {tile.type === 'railroad' && (
          <div className="mb-0.5 text-slate-800 opacity-85">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2c-4 0-7 2.5-7 6v8c0 1.5 1.5 3 3 3l-1 2h1.5l1-2h5l1 2h1.5l-1-2c1.5 0 3-1.5 3-3V8c0-3.5-3-6-7-6zm-4 6c0-.5.5-1 1-1h6c.5 0 1 .5 1 1v2c0 .5-.5 1-1 1H9c-.5 0-1-.5-1-1V8zm1.5 8c-.8 0-1.5-.7-1.5-1.5S8.7 13 9.5 13s1.5.7 1.5 1.5S10.3 16 9.5 16zm5 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5z"/>
            </svg>
          </div>
        )}

        {tile.type === 'utility' && (
          <div className="mb-0.5 text-blue-600 opacity-85">
            {tile.name.toLowerCase().includes('water') ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2c-4.42 0-8 3.58-8 8 0 4.1 3.52 9.5 8 12 4.48-2.5 8-7.9 8-12 0-4.42-3.58-8-8-8zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .6.4 1 1 1h6c.6 0 1-.4 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7zm-3 18c0 .6.4 1 1 1h4c.6 0 1-.4 1-1v-1H9v1z"/>
              </svg>
            )}
          </div>
        )}

        {tile.type === 'tax' && (
          <div className="mb-0.5 text-amber-700 opacity-85 flex flex-col items-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2c-5.53 0-10 4.47-10 10s4.47 10 10 10 10-4.47 10-10-4.47-10-10-10zm1 14h-2v-2h2v2zm0-4h-2v-5h2v5z" />
            </svg>
          </div>
        )}

        {special && (
          <div
            className="rounded-full flex items-center justify-center font-bold text-white mb-0.5 shadow-sm"
            style={{
              width: 'clamp(12px, 1.8vw, 20px)',
              height: 'clamp(12px, 1.8vw, 20px)',
              fontSize: 'clamp(7px, 1vw, 11px)',
              backgroundColor: SPECIAL_ICON_BG[tile.type] ?? '#6b7280',
            }}
          >
            {SPECIAL_ICONS[tile.type] ?? ''}
          </div>
        )}

        {/* Property name */}
        <span
          className="font-bold leading-tight uppercase tracking-wide text-center"
          style={{
            fontSize: 'clamp(5.5px, 0.9vw, 9.5px)',
            color: '#1e293b',
            lineHeight: 1.15,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
             overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'break-word',
          }}
        >
          {tile.name}
        </span>

        {/* Property price */}
        {price !== null && price !== undefined && (
          <span
            className="font-extrabold mt-1"
            style={{
              fontSize: 'clamp(6px, 0.9vw, 10px)',
              color: '#047857',
            }}
          >
            ${price}
          </span>
        )}
      </div>

      {/* Elegant mortgaged visual stamp overlay */}
      {isMortgaged && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
          <div className="border border-red-500 bg-red-950 text-red-400 font-black tracking-widest uppercase py-0.5 px-1 rounded-sm text-[5.5px] scale-90 -rotate-12 select-none shadow">
            MORTGAGED
          </div>
        </div>
      )}

      {/* Hover visual gloss light reflex effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white to-transparent opacity-0 group-hover:opacity-[0.12] transition-opacity pointer-events-none duration-200" />

      {/* Players Tokens list */}
      <PlayerTokensList players={tilePlayers} activePlayerId={activePlayerId} />
    </motion.div>
  );
}

// Player Tokens Grid List Component
function PlayerTokensList({ players, activePlayerId }: { players: Player[]; activePlayerId: string | null }) {
  if (players.length === 0) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div className="flex flex-wrap items-center justify-center gap-1 max-w-[90%] p-0.5">
        {players.map((p) => {
          const isActive = p.id === activePlayerId;
          const tokenColor = PLAYER_COLORS[p.color] ?? '#9CA3AF';
          return (
            <motion.div
              key={p.id}
              initial={{ scale: 0, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              className="relative rounded-full flex items-center justify-center shadow-md"
              style={{
                width: 'clamp(10px, 1.8vw, 17px)',
                height: 'clamp(10px, 1.8vw, 17px)',
                background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${tokenColor} 45%, ${tokenColor} 80%, #000000 100%)`,
                border: '1.2px solid #ffffff',
                boxShadow: isActive 
                  ? `0 0 10px 2px ${tokenColor}, 0 2px 4px rgba(0,0,0,0.4)`
                  : '0 1.5px 3px rgba(0,0,0,0.3)',
              }}
              title={p.name}
            >
              {/* Token gloss highlight dot */}
              <div className="absolute top-[8%] left-[8%] w-[25%] h-[25%] rounded-full bg-white opacity-75 filter blur-[0.3px]" />
              {/* Pulsing state ring for currently acting active player */}
              {isActive && (
                <div 
                  className="absolute -inset-1.5 rounded-full border border-yellow-400 opacity-80 animate-ping"
                  style={{ animationDuration: '1.4s' }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function getColor(tile: Tile): string | null {
  if (tile.type === 'property') return COLOR_MAP[(tile as PropertyTile).color] ?? null;
  return null;
}

function getColorGradient(tile: Tile): string[] | null {
  if (tile.type === 'property') return COLOR_GRADIENTS[(tile as PropertyTile).color] ?? null;
  return null;
}

function getPrice(tile: Tile): number | null {
  if (tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility') {
    return (tile as PropertyTile | RailroadTile | UtilityTile).price;
  }
  return null;
}

// AnimatedToken component with premium design matching the static pieces
function AnimatedToken({
  playerId,
  fromPosition,
  toPosition,
  players,
}: {
  playerId: string;
  fromPosition: number;
  toPosition: number;
  players: Player[];
}) {
  const player = players.find((p) => p.id === playerId);
  if (!player) return null;

  const fromLayout = LAYOUT[fromPosition];
  const toLayout = LAYOUT[toPosition];
  if (!fromLayout || !toLayout) return null;

  // Calculate pixel positions (center of tile)
  const fromX = (fromLayout.x + fromLayout.w / 2) / GRID * 100;
  const fromY = (fromLayout.y + fromLayout.h / 2) / GRID * 100;
  const toX = (toLayout.x + toLayout.w / 2) / GRID * 100;
  const toY = (toLayout.y + toLayout.h / 2) / GRID * 100;

  const tokenColor = PLAYER_COLORS[player.color] ?? '#9CA3AF';

  return (
    <motion.div
      className="absolute z-30 pointer-events-none"
      style={{
        width: 'clamp(14px, 2.2vw, 22px)',
        height: 'clamp(14px, 2.2vw, 22px)',
      }}
      initial={{ left: `${fromX}%`, top: `${fromY}%`, x: '-50%', y: '-50%', scale: 1.4 }}
      animate={{ left: `${toX}%`, top: `${toY}%`, x: '-50%', y: '-50%', scale: 1 }}
      transition={{
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1], // elegant cinematic springy curve
      }}
    >
      <div
        className="w-full h-full rounded-full border-2 border-white shadow-xl relative"
        style={{
          background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${tokenColor} 45%, ${tokenColor} 80%, #000000 100%)`,
          boxShadow: `0 0 16px ${tokenColor}a0, 0 4px 8px rgba(0,0,0,0.5)`,
        }}
      >
        <div className="absolute top-[8%] left-[8%] w-[25%] h-[25%] rounded-full bg-white opacity-75 filter blur-[0.3px]" />
      </div>
    </motion.div>
  );
}
