import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DiceRoll } from '@monopoly/shared';

interface DiceRollProps {
  roll: DiceRoll | null;
  rolling: boolean;
  onRoll: () => void;
  canRoll: boolean;
  phase: string;
}

function RandomDotPattern() {
  // Generate random dot positions for rolling effect
  const patterns: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    patterns.push([Math.floor(Math.random() * 3), Math.floor(Math.random() * 3)]);
  }
  return patterns;
}

export function DiceRollDisplay({ roll, rolling, onRoll, canRoll, phase }: DiceRollProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const DOT_PATTERNS: Record<number, [number, number][]> = {
    1: [[1, 1]],
    2: [[0, 2], [2, 0]],
    3: [[0, 2], [1, 1], [2, 0]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
  };

  function getDots(value: number): [number, number][] {
    return DOT_PATTERNS[value] ?? [];
  }

  function renderDie(value: number, index: number) {
    return (
      <motion.div
        key={`die-${index}`}
        className="w-14 h-14 bg-white rounded-xl shadow-inner flex items-center justify-center p-2"
        animate={
          rolling
            ? {
                rotate: [0, -8, 8, -5, 5, 0],
                scale: [1, 1.05, 0.95, 1.02, 1],
              }
            : { rotate: 0, scale: 1 }
        }
        transition={
          rolling
            ? { duration: 0.3, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.2 }
        }
      >
        <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full">
          {Array.from({ length: 3 }, (_, row) =>
            Array.from({ length: 3 }, (_, col) => {
              const dots = rolling ? RandomDotPattern() : getDots(value);
              const isActive = dots.some(([r, c]) => r === row && c === col);
              return (
                <div key={`${row}-${col}`} className="flex items-center justify-center">
                  {isActive && (
                    <motion.div
                      className="w-2 h-2 bg-gray-800 rounded-full"
                      animate={rolling ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
                      transition={rolling ? { duration: 0.2, repeat: Infinity } : {}}
                    />
                  )}
                </div>
              );
            }),
          )}
        </div>
      </motion.div>
    );
  }

  const isWaitingToRoll = phase === 'waiting-to-roll';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-3">
        <AnimatePresence mode="wait">
          {rolling ? (
            <>
              {renderDie(1, 0)}
              {renderDie(2, 1)}
            </>
          ) : roll ? (
            <>
              {renderDie(roll.die1, 0)}
              {renderDie(roll.die2, 1)}
            </>
          ) : (
            <>
              <div className="w-14 h-14 bg-gray-700 rounded-xl" />
              <div className="w-14 h-14 bg-gray-700 rounded-xl" />
            </>
          )}
        </AnimatePresence>
      </div>
      {roll && !rolling && (
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-xl font-bold">{roll.total}</div>
          {roll.isDoubles && (
            <motion.div
              className="text-xs text-yellow-400 font-semibold"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            >
              Doubles!
            </motion.div>
          )}
        </motion.div>
      )}
      {isWaitingToRoll && canRoll && (
        <motion.button
          className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-6 rounded-lg transition text-sm"
          onClick={onRoll}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Roll Dice
        </motion.button>
      )}
    </div>
  );
}
