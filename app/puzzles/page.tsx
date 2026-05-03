'use client';

import { useState } from 'react';
import { PUZZLES, getDailyPuzzleIndex } from '@/lib/puzzles';
import PuzzleBoard from '@/components/PuzzleBoard';
import { useLang } from '@/context/LangContext';

const FREE_LIMIT = 5;

export default function PuzzlesPage() {
  const { t } = useLang();
  const dailyIdx = getDailyPuzzleIndex();

  // Start from daily puzzle, then cycle through the rest
  const orderedPuzzles = [
    PUZZLES[dailyIdx],
    ...PUZZLES.filter((_, i) => i !== dailyIdx),
  ];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [showProGate, setShowProGate] = useState(false);

  const puzzle = orderedPuzzles[currentIdx];
  const isDaily = currentIdx === 0;

  function onSolved() {
    const next = solvedCount + 1;
    setSolvedCount(next);
    if (next >= FREE_LIMIT) {
      setShowProGate(true);
    }
  }

  function nextPuzzle() {
    if (solvedCount >= FREE_LIMIT) {
      setShowProGate(true);
      return;
    }
    setCurrentIdx(i => (i + 1) % orderedPuzzles.length);
  }

  const difficultyColor = {
    easy:   'text-green-400',
    medium: 'text-yellow-400',
    hard:   'text-red-400',
  }[puzzle.difficulty];

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">{t('puzzlesTitle')}</h1>
        <p className="text-gray-400">{t('puzzlesSub')}</p>
      </div>

      {/* Puzzle meta */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isDaily && (
            <span className="px-2.5 py-0.5 bg-indigo-900 border border-indigo-700 text-indigo-300 text-xs font-bold rounded-full">
              ★ {t('dailyPuzzle')}
            </span>
          )}
          <span className={`text-sm font-semibold ${difficultyColor}`}>{puzzle.difficulty.charAt(0).toUpperCase() + puzzle.difficulty.slice(1)}</span>
          <span className="text-gray-500 text-sm">{puzzle.theme}</span>
        </div>
        <span className="text-gray-600 text-sm tabular-nums">
          {t('puzzleProgress')} {currentIdx + 1} {t('of')} {orderedPuzzles.length}
        </span>
      </div>

      {/* Free limit progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{solvedCount} / {FREE_LIMIT} {t('puzzleProgress').toLowerCase()}s solved today (free)</span>
        </div>
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((solvedCount / FREE_LIMIT) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Board */}
      <PuzzleBoard
        key={`${puzzle.id}-${currentIdx}`}
        puzzle={puzzle}
        onSolved={onSolved}
      />

      {/* Next button (shown after solve) */}
      {solvedCount > (currentIdx === 0 ? 0 : currentIdx) && (
        <button
          onClick={nextPuzzle}
          className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
        >
          {t('nextPuzzle')}
        </button>
      )}

      {/* Pro gate modal */}
      {showProGate && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowProGate(false)}>
          <div className="bg-gray-900 border border-indigo-800 rounded-2xl p-8 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-4">♛</div>
            <h3 className="text-white font-bold text-xl mb-2">{t('proGate')}</h3>
            <p className="text-gray-400 text-sm mb-6">{t('proGateSub')}</p>
            <button
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors mb-3"
              onClick={() => setShowProGate(false)}
            >
              {t('upgradePro')}
            </button>
            <button
              onClick={() => setShowProGate(false)}
              className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
