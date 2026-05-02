'use client';

import { useState } from 'react';

interface Props {
  moves: string[];
  isGameOver: boolean;
}

interface CoachTip {
  moveNumber: number;
  move: string;
  tip: string;
  type: 'blunder' | 'mistake' | 'good' | 'excellent';
}

export default function AICoach({ moves, isGameOver }: Props) {
  const [tips, setTips] = useState<CoachTip[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  async function analyze() {
    if (moves.length < 4) return;
    setLoading(true);

    // Simple heuristic analysis (no API key needed)
    const generated: CoachTip[] = [];
    for (let i = 0; i < Math.min(moves.length, 20); i++) {
      const move = moves[i];
      const isCapture = move.includes('x');
      const isCheck = move.includes('+');
      const isMate = move.includes('#');
      const isCastle = move.startsWith('O');

      let type: CoachTip['type'] = 'good';
      let tip = '';

      if (isMate) { type = 'excellent'; tip = 'Checkmate! Perfect finish.'; }
      else if (isCheck && isCapture) { type = 'excellent'; tip = 'Great — capturing with check puts maximum pressure.'; }
      else if (isCastle) { type = 'good'; tip = 'Good — castling keeps your king safe.'; }
      else if (isCapture) { type = 'good'; tip = 'Material captured. Make sure it was a fair trade.'; }
      else if (i < 6 && move.match(/^[a-h][2-7]$/)) { type = 'mistake'; tip = 'Pawn push in the opening — prefer developing pieces first.'; }
      else if (i > 20) { type = 'good'; tip = 'Solid endgame move.'; }
      else { type = 'good'; tip = 'Reasonable move, continuing development.'; }

      if (tip) generated.push({ moveNumber: Math.floor(i / 2) + 1, move, type, tip });
    }

    setTips(generated.slice(0, 8));
    setAnalyzed(true);
    setLoading(false);
  }

  if (!isGameOver && moves.length < 10) return null;

  const typeColor = { blunder: 'text-red-400', mistake: 'text-orange-400', good: 'text-green-400', excellent: 'text-yellow-400' };
  const typeIcon = { blunder: '❌', mistake: '⚠️', good: '✓', excellent: '⭐' };

  return (
    <div className="w-full max-w-5xl mt-4 bg-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold text-lg">🧠 AI Coach</h3>
        {!analyzed && (
          <button
            onClick={analyze}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm rounded-lg font-semibold transition-colors"
          >
            {loading ? 'Analyzing...' : 'Analyze Game'}
          </button>
        )}
      </div>

      {analyzed && tips.length > 0 && (
        <div className="flex flex-col gap-2">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-3 bg-gray-700 rounded-lg p-3">
              <span className="text-lg">{typeIcon[tip.type]}</span>
              <div>
                <span className={`text-sm font-bold ${typeColor[tip.type]}`}>
                  Move {tip.moveNumber}: {tip.move}
                </span>
                <p className="text-gray-300 text-sm mt-0.5">{tip.tip}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
