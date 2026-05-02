'use client';

import { useState } from 'react';
import { analyzeGame, AnalyzedMoment } from '@/lib/analyzeGame';

const TYPE_CONFIG = {
  blunder:    { label: 'Blunder',    color: 'text-red-400',    bg: 'bg-red-900/40 border-red-700',       icon: '??' },
  mistake:    { label: 'Mistake',    color: 'text-orange-400', bg: 'bg-orange-900/40 border-orange-700', icon: '?' },
  inaccuracy: { label: 'Inaccuracy', color: 'text-yellow-400', bg: 'bg-yellow-900/40 border-yellow-700', icon: '?!' },
};

const FREE_LIMIT = 3;

interface Props {
  moves: string[];
  isGameOver: boolean;
}

export default function AICoach({ moves, isGameOver }: Props) {
  const [moments, setMoments] = useState<AnalyzedMoment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!isGameOver || moves.length < 6) return null;

  async function analyze() {
    setLoading(true);
    setProgress(0);
    try {
      const results = await analyzeGame(moves, setProgress);
      setMoments(results);
    } finally {
      setLoading(false);
    }
  }

  // ── Prompt ────────────────────────────────────────────────────────────────
  if (!moments && !loading) return (
    <div className="w-full max-w-5xl bg-gray-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          ♟ Game Analysis
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">Powered by Stockfish</span>
        </h3>
        <p className="text-gray-400 text-sm mt-1">Find blunders, mistakes and better moves — runs locally, instant and free.</p>
      </div>
      <button onClick={analyze}
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors whitespace-nowrap shrink-0">
        Analyze Game
      </button>
    </div>
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="w-full max-w-5xl bg-gray-800 rounded-2xl p-8 flex flex-col items-center gap-4">
      <div className="text-4xl animate-bounce">♟</div>
      <p className="text-white font-semibold">Analyzing {moves.length} moves...</p>
      <div className="w-full max-w-xs bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-gray-400 text-sm">{progress}% complete</p>
    </div>
  );

  if (!moments) return null;

  const freeMoments = moments.slice(0, FREE_LIMIT);
  const lockedMoments = moments.slice(FREE_LIMIT);
  const counts = moments.reduce((acc, m) => { acc[m.type] = (acc[m.type] || 0) + 1; return acc; }, {} as Record<string, number>);
  const totalErrors = (counts.blunder || 0) + (counts.mistake || 0) + (counts.inaccuracy || 0);

  // ── Upgrade modal ─────────────────────────────────────────────────────────
  const UpgradeModal = () => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowUpgrade(false)}>
      <div className="bg-gray-900 border border-indigo-700 rounded-2xl p-8 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
        <div className="text-5xl mb-4">♛</div>
        <h2 className="text-2xl font-bold text-white mb-1">Upgrade to Pro</h2>
        <p className="text-indigo-400 font-bold text-xl mb-4">990 KZT / month</p>
        <ul className="text-left text-gray-300 text-sm flex flex-col gap-2 mb-6">
          <li className="flex gap-2"><span className="text-green-400">✓</span> Full game breakdown — all key moments</li>
          <li className="flex gap-2"><span className="text-green-400">✓</span> Progress tracking across all your games</li>
          <li className="flex gap-2"><span className="text-green-400">✓</span> Most common mistake patterns</li>
          <li className="flex gap-2"><span className="text-green-400">✓</span> Win rate by opening</li>
          <li className="flex gap-2"><span className="text-green-400">✓</span> Exclusive Marble board theme</li>
          <li className="flex gap-2"><span className="text-green-400">✓</span> City leaderboard badge</li>
        </ul>
        <button
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors mb-3"
          onClick={() => setShowUpgrade(false)}
        >
          Coming Soon — Notify Me
        </button>
        <button onClick={() => setShowUpgrade(false)} className="text-gray-500 text-sm hover:text-gray-300">
          Maybe later
        </button>
      </div>
    </div>
  );

  // ── Results ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl flex flex-col gap-4">
      {showUpgrade && <UpgradeModal />}

      {/* Header */}
      <div className="bg-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">♟</span>
          <h3 className="text-white font-bold text-xl">Game Analysis</h3>
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">Stockfish</span>
        </div>

        {totalErrors === 0 ? (
          <p className="text-green-400 font-semibold">Excellent game! No significant errors found.</p>
        ) : (
          <p className="text-gray-300">
            Found <span className="text-white font-bold">{totalErrors}</span> moment{totalErrors !== 1 ? 's' : ''} worth reviewing.
          </p>
        )}

        {/* Stats */}
        <div className="flex flex-wrap gap-3 mt-4">
          {(['blunder', 'mistake', 'inaccuracy'] as const).map(type => {
            const n = counts[type] || 0;
            if (!n) return null;
            const cfg = TYPE_CONFIG[type];
            return (
              <div key={type} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${cfg.bg}`}>
                <span className={`text-xs font-bold ${cfg.color}`}>{cfg.icon}</span>
                <span className="text-white text-sm font-bold">{n}</span>
                <span className="text-gray-400 text-xs">{cfg.label}{n > 1 ? 's' : ''}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key moments */}
      {moments.length > 0 && (
        <div className="bg-gray-800 rounded-2xl p-5">
          <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Key Moments — {freeMoments.length} of {moments.length} shown free
          </h4>

          <div className="flex flex-col gap-2">
            {freeMoments.map((m, i) => {
              const cfg = TYPE_CONFIG[m.type];
              const isOpen = expanded === i;
              return (
                <button key={i} onClick={() => setExpanded(isOpen ? null : i)}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${cfg.bg} hover:opacity-90`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold w-8 shrink-0 ${cfg.color}`}>{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-bold">{m.moveNumber}. {m.moveSan}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-900/50 ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="text-gray-500 text-xs capitalize">{m.player}</span>
                      </div>
                      {isOpen ? (
                        <div className="mt-2 text-sm text-gray-300 space-y-1">
                          <p>Better move: <span className="text-green-400 font-bold">{m.suggestedSan}</span></p>
                          <p className="text-gray-500 text-xs">
                            Lost ~{(m.cpLoss / 100).toFixed(1)} pawns of advantage
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-400 text-xs mt-1">
                          Better: <span className="text-green-400 font-semibold">{m.suggestedSan}</span>
                          <span className="text-gray-600 ml-2">△{(m.cpLoss / 100).toFixed(1)} pawns</span>
                        </p>
                      )}
                    </div>
                    <span className="text-gray-500 text-sm shrink-0">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Blur paywall */}
          {lockedMoments.length > 0 && (
            <div className="relative mt-2">
              {/* Ghost cards (blurred) */}
              <div className="flex flex-col gap-2 filter blur-sm pointer-events-none select-none">
                {lockedMoments.map((m, i) => {
                  const cfg = TYPE_CONFIG[m.type];
                  return (
                    <div key={i} className={`w-full rounded-xl border p-4 ${cfg.bg}`}>
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-bold w-8 ${cfg.color}`}>{cfg.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">{m.moveNumber}. {m.moveSan}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-900/50 ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs mt-1">Better: {m.suggestedSan}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 rounded-xl">
                <div className="text-3xl mb-2">🔒</div>
                <p className="text-white font-bold text-lg">
                  {lockedMoments.length} more moment{lockedMoments.length > 1 ? 's' : ''} hidden
                </p>
                <p className="text-gray-400 text-sm mt-1 mb-4">Unlock full analysis with Pro</p>
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm"
                >
                  Upgrade — 990 KZT/month
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
