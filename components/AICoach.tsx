'use client';

import { useState } from 'react';

interface KeyMoment {
  moveNumber: number;
  move: string;
  player: string;
  type: 'brilliant' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  explanation: string;
}

interface Analysis {
  summary: string;
  opening: { name: string; assessment: string };
  keyMoments: KeyMoment[];
  positives: string[];
  improvements: string[];
  lesson: string;
}

interface Props {
  moves: string[];
  isGameOver: boolean;
  playerColor?: 'white' | 'black';
}

const TYPE_CONFIG = {
  brilliant: { label: 'Brilliant!!', color: 'text-cyan-400', bg: 'bg-cyan-900/40 border-cyan-700', icon: '✦✦' },
  good:      { label: 'Good',       color: 'text-green-400', bg: 'bg-green-900/40 border-green-700', icon: '✓' },
  inaccuracy:{ label: 'Inaccuracy', color: 'text-yellow-400', bg: 'bg-yellow-900/40 border-yellow-700', icon: '?!' },
  mistake:   { label: 'Mistake',    color: 'text-orange-400', bg: 'bg-orange-900/40 border-orange-700', icon: '?' },
  blunder:   { label: 'Blunder',    color: 'text-red-400',    bg: 'bg-red-900/40 border-red-700',    icon: '??' },
};

export default function AICoach({ moves, isGameOver, playerColor = 'white' }: Props) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!isGameOver || moves.length < 6) return null;

  async function analyze() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves, playerColor }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setAnalysis(data);
    } catch {
      setError('Analysis failed. Make sure ANTHROPIC_API_KEY is set in Vercel.');
    }
    setLoading(false);
  }

  // ── Prompt screen ──────────────────────────────────────────────────────────
  if (!analysis && !loading) return (
    <div className="w-full max-w-5xl bg-gray-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h3 className="text-white font-bold text-lg flex items-center gap-2">🧠 AI Coach <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Powered by Claude</span></h3>
        <p className="text-gray-400 text-sm mt-1">Get a full breakdown of your game — mistakes, key moments, and how to improve.</p>
      </div>
      <button onClick={analyze}
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors whitespace-nowrap shrink-0">
        Analyze My Game
      </button>
      {error && <p className="text-red-400 text-sm w-full">{error}</p>}
    </div>
  );

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="w-full max-w-5xl bg-gray-800 rounded-2xl p-10 flex flex-col items-center gap-4">
      <div className="text-5xl animate-bounce">♟</div>
      <p className="text-white font-semibold text-lg">Analyzing your game...</p>
      <p className="text-gray-400 text-sm">Claude is reviewing all {moves.length} moves</p>
      <div className="flex gap-1 mt-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );

  if (!analysis) return null;

  const momentsByType = analysis.keyMoments.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // ── Full analysis ──────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl flex flex-col gap-4">
      {/* Header */}
      <div className="bg-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🧠</span>
          <h3 className="text-white font-bold text-xl">AI Coach Analysis</h3>
          <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Powered by Claude</span>
        </div>
        <p className="text-gray-300 leading-relaxed">{analysis.summary}</p>

        {/* Stats row */}
        <div className="flex flex-wrap gap-3 mt-4">
          {Object.entries(momentsByType).map(([type, count]) => {
            const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
            return (
              <div key={type} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${cfg.bg}`}>
                <span className={`text-xs font-bold ${cfg.color}`}>{cfg.icon}</span>
                <span className="text-white text-sm font-semibold">{count}</span>
                <span className="text-gray-400 text-xs">{cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Opening */}
        <div className="bg-gray-800 rounded-2xl p-5">
          <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Opening</h4>
          <p className="text-indigo-300 font-bold mb-1">{analysis.opening.name}</p>
          <p className="text-gray-300 text-sm leading-relaxed">{analysis.opening.assessment}</p>
        </div>

        {/* Key lesson */}
        <div className="bg-indigo-900/50 border border-indigo-700 rounded-2xl p-5">
          <h4 className="text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">⭐ Key Lesson</h4>
          <p className="text-white font-semibold leading-relaxed">{analysis.lesson}</p>
        </div>
      </div>

      {/* Key moments */}
      <div className="bg-gray-800 rounded-2xl p-5">
        <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-4">Key Moments</h4>
        <div className="flex flex-col gap-2">
          {analysis.keyMoments.map((moment, i) => {
            const cfg = TYPE_CONFIG[moment.type] ?? TYPE_CONFIG.good;
            const isOpen = expanded === i;
            return (
              <button key={i} onClick={() => setExpanded(isOpen ? null : i)}
                className={`w-full text-left rounded-xl border p-4 transition-all ${cfg.bg} hover:opacity-90`}>
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold w-8 shrink-0 ${cfg.color}`}>{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold">{moment.moveNumber}. {moment.move}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-900/50 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="text-gray-500 text-xs capitalize">{moment.player}</span>
                    </div>
                    {isOpen && (
                      <p className="text-gray-300 text-sm mt-2 leading-relaxed">{moment.explanation}</p>
                    )}
                  </div>
                  <span className="text-gray-500 text-sm shrink-0">{isOpen ? '▲' : '▼'}</span>
                </div>
                {!isOpen && (
                  <p className="text-gray-400 text-xs mt-1 ml-11 truncate">{moment.explanation}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Positives + Improvements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-2xl p-5">
          <h4 className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-3">✓ What You Did Well</h4>
          <ul className="flex flex-col gap-2">
            {analysis.positives.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <span className="text-green-400 shrink-0">•</span>{p}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-gray-800 rounded-2xl p-5">
          <h4 className="text-orange-400 text-xs font-semibold uppercase tracking-wider mb-3">↑ Areas to Improve</h4>
          <ul className="flex flex-col gap-2">
            {analysis.improvements.map((imp, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <span className="text-orange-400 shrink-0">•</span>{imp}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
