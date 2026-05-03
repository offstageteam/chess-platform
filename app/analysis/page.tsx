'use client';

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Chess, Square } from 'chess.js';
import { useLang } from '@/context/LangContext';

const Chessboard = dynamic(() => import('react-chessboard').then(m => m.Chessboard), { ssr: false });

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

interface EvalResult {
  score: number;   // centipawns (positive = white better)
  bestMove: string | null;
  bestMoveSan: string | null;
  depth: number;
}

function formatScore(cp: number): string {
  if (Math.abs(cp) >= 10000) {
    const mateIn = Math.ceil((20000 - Math.abs(cp)) / 2);
    return cp > 0 ? `M${mateIn}` : `-M${mateIn}`;
  }
  const pawns = cp / 100;
  return pawns > 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
}

function evalBarHeight(cp: number): number {
  // Returns % for white's bar (0–100)
  const clamped = Math.max(-1000, Math.min(1000, cp));
  return 50 + (clamped / 1000) * 50;
}

function AnalysisBoard() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const [game, setGame] = useState(() => {
    // Support loading a game from archive via ?pgn= query param (resolved client-side)
    return new Chess();
  });
  const [fenInput, setFenInput] = useState('');
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<Record<string, React.CSSProperties>>({});
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1); // -1 = latest
  const [fenHistory, setFenHistory] = useState<string[]>([STARTING_FEN]);
  const workerRef = useRef<Worker | null>(null);

  // Load game from ?pgn= on mount
  useEffect(() => {
    const pgn = searchParams.get('pgn');
    if (!pgn) return;
    try {
      // Parse SAN tokens from PGN string like "1. e4 e5 2. Nf3 ..."
      const tokens = pgn.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean);
      const g = new Chess();
      const sans: string[] = [];
      const fens: string[] = [g.fen()];
      for (const san of tokens) {
        try {
          const move = g.move(san);
          if (move) { sans.push(move.san); fens.push(g.fen()); }
        } catch { break; }
      }
      setGame(new Chess(fens[fens.length - 1]));
      setMoveHistory(sans);
      setFenHistory(fens);
      setHistoryIdx(-1);
    } catch { /* ignore invalid pgn */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Run Stockfish on current position
  const analyze = useCallback((fen: string) => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setAnalyzing(true);
    setEvalResult(null);

    const worker = new Worker('/stockfish.js');
    workerRef.current = worker;

    let bestMove: string | null = null;
    let score = 0;
    let depth = 0;
    const isBlack = fen.split(' ')[1] === 'b';

    worker.onmessage = (e: MessageEvent<string>) => {
      const line = e.data;
      const cpMatch = line.match(/score cp (-?\d+)/);
      const mateMatch = line.match(/score mate (-?\d+)/);
      const depthMatch = line.match(/depth (\d+)/);
      const bmMatch = line.match(/bestmove (\S+)/);

      if (depthMatch) depth = parseInt(depthMatch[1]);
      if (cpMatch) {
        const raw = parseInt(cpMatch[1]);
        score = isBlack ? -raw : raw;
      }
      if (mateMatch) {
        const m = parseInt(mateMatch[1]);
        score = isBlack ? -(20000 - Math.abs(m) * 10) * Math.sign(m)
                        :  (20000 - Math.abs(m) * 10) * Math.sign(m);
      }

      if (bmMatch) {
        bestMove = bmMatch[1] === '(none)' ? null : bmMatch[1];
        // Convert to SAN
        let bestMoveSan: string | null = null;
        if (bestMove) {
          try {
            const g = new Chess(fen);
            const move = g.move({
              from: bestMove.slice(0, 2) as Square,
              to: bestMove.slice(2, 4) as Square,
              promotion: bestMove[4] ?? 'q',
            });
            bestMoveSan = move?.san ?? null;
          } catch { /* ignore */ }
        }
        setEvalResult({ score, bestMove, bestMoveSan, depth });
        setAnalyzing(false);
        worker.terminate();
        workerRef.current = null;
      }
    };

    worker.postMessage('uci');
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage('go depth 15');
  }, []);

  // Analyze whenever position changes
  useEffect(() => {
    analyze(game.fen());
    return () => { workerRef.current?.terminate(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.fen()]);

  function loadFen() {
    const fen = fenInput.trim();
    if (!fen) return;
    try {
      const g = new Chess(fen);
      setGame(g);
      setMoveHistory([]);
      setFenHistory([g.fen()]);
      setHistoryIdx(-1);
      setFenInput('');
      setSelectedSquare(null);
      setLegalMoves({});
    } catch {
      alert('Invalid FEN position');
    }
  }

  function resetBoard() {
    const g = new Chess();
    setGame(g);
    setMoveHistory([]);
    setFenHistory([STARTING_FEN]);
    setHistoryIdx(-1);
    setFenInput('');
    setSelectedSquare(null);
    setLegalMoves({});
  }

  function highlightMoves(square: string) {
    const g = new Chess(game.fen());
    const moves = g.moves({ square: square as Square, verbose: true });
    if (!moves.length) { setLegalMoves({}); return; }
    const h: Record<string, React.CSSProperties> = {
      [square]: { backgroundColor: 'rgba(201,150,42,0.45)' },
    };
    moves.forEach(m => { h[m.to] = { backgroundColor: 'rgba(201,150,42,0.25)', borderRadius: '50%' }; });
    setLegalMoves(h);
  }

  function onSquareClick({ square }: { piece: unknown; square: string }) {
    if (selectedSquare && selectedSquare !== square) {
      const g = new Chess(game.fen());
      try {
        const move = g.move({ from: selectedSquare as Square, to: square as Square, promotion: 'q' });
        if (move) {
          setGame(g);
          const newHistory = [...moveHistory, move.san];
          setMoveHistory(newHistory);
          setFenHistory(h => [...h, g.fen()]);
          setHistoryIdx(-1);
          setSelectedSquare(null);
          setLegalMoves({});
          return;
        }
      } catch { /* fall through */ }
    }
    const piece = game.get(square as Square);
    if (piece) {
      setSelectedSquare(square);
      highlightMoves(square);
    } else {
      setSelectedSquare(null);
      setLegalMoves({});
    }
  }

  const onDrop = useCallback(({ sourceSquare, targetSquare }: { piece: unknown; sourceSquare: string; targetSquare: string | null }) => {
    if (!targetSquare) return false;
    const g = new Chess(game.fen());
    try {
      const move = g.move({ from: sourceSquare as Square, to: targetSquare as Square, promotion: 'q' });
      if (!move) return false;
      setGame(g);
      setMoveHistory(h => [...h, move.san]);
      setFenHistory(h => [...h, g.fen()]);
      setHistoryIdx(-1);
      setSelectedSquare(null);
      setLegalMoves({});
      return true;
    } catch { return false; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  // Navigate history
  function goToMove(idx: number) {
    const fen = fenHistory[idx + 1] ?? fenHistory[fenHistory.length - 1];
    setGame(new Chess(fen));
    setHistoryIdx(idx);
    setSelectedSquare(null);
    setLegalMoves({});
  }

  // Best move highlight
  const bestMoveHighlight: Record<string, React.CSSProperties> = {};
  if (evalResult?.bestMove) {
    const from = evalResult.bestMove.slice(0, 2);
    const to = evalResult.bestMove.slice(2, 4);
    bestMoveHighlight[from] = { backgroundColor: 'rgba(201,150,42,0.35)' };
    bestMoveHighlight[to]   = { backgroundColor: 'rgba(201,150,42,0.55)' };
  }

  const barHeight = evalResult ? evalBarHeight(evalResult.score) : 50;
  const scoreLabel = evalResult ? formatScore(evalResult.score) : '0.00';
  const scoreColor = evalResult && evalResult.score > 50 ? 'text-white' : evalResult && evalResult.score < -50 ? 'text-gray-400' : 'text-gray-300';

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">{t('analysisTitle')}</h1>
        <p className="text-gray-400">{t('analysisSub')}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: eval bar + board */}
        <div className="flex gap-3 flex-shrink-0">
          {/* Evaluation bar */}
          <div className="w-5 bg-gray-800 rounded-full overflow-hidden border border-gray-700 relative" style={{ height: 480 }}>
            {/* Black's side (top) */}
            <div
              className="absolute top-0 left-0 w-full bg-gray-600 transition-all duration-500"
              style={{ height: `${100 - barHeight}%` }}
            />
            {/* White's side (bottom) */}
            <div
              className="absolute bottom-0 left-0 w-full bg-gray-100 transition-all duration-500"
              style={{ height: `${barHeight}%` }}
            />
          </div>

          {/* Board */}
          <div style={{ width: 480 }}>
            <Chessboard
              options={{
                position: game.fen(),
                boardOrientation: orientation,
                onPieceDrop: onDrop,
                onSquareClick,
                squareStyles: Object.keys(legalMoves).length > 0 ? legalMoves : bestMoveHighlight,
                animationDurationInMs: 150,
              }}
            />
          </div>
        </div>

        {/* Right: eval + controls + moves */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Evaluation display */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-baseline gap-2 mb-1">
              <span className={`text-3xl font-bold font-mono ${scoreColor}`}>
                {analyzing ? '…' : scoreLabel}
              </span>
              {evalResult && (
                <span className="text-gray-500 text-xs">depth {evalResult.depth}</span>
              )}
              {analyzing && (
                <span className="text-gray-500 text-xs animate-pulse">{t('analyzing')}</span>
              )}
            </div>
            {evalResult?.bestMoveSan && (
              <p className="text-gray-400 text-sm">
                {t('bestMove')}: <span className="text-indigo-400 font-bold font-mono">{evalResult.bestMoveSan}</span>
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={resetBoard}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {t('resetBoard')}
            </button>
            <button
              onClick={() => setOrientation(o => o === 'white' ? 'black' : 'white')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              ⇅ {t('flipBoard')}
            </button>
          </div>

          {/* FEN input */}
          <div className="flex gap-2">
            <input
              value={fenInput}
              onChange={e => setFenInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadFen()}
              placeholder={t('pastePosition')}
              className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600 border border-gray-700 placeholder-gray-600"
            />
            <button
              onClick={loadFen}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors whitespace-nowrap"
            >
              {t('loadFen')}
            </button>
          </div>

          {/* Move history */}
          {moveHistory.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex-1 overflow-y-auto">
              <div className="flex flex-wrap gap-1">
                {moveHistory.map((san, i) => {
                  const isWhiteMove = i % 2 === 0;
                  const moveNum = Math.floor(i / 2) + 1;
                  const isActive = historyIdx === i || (historyIdx === -1 && i === moveHistory.length - 1);
                  return (
                    <span key={i} className="flex items-center gap-0.5">
                      {isWhiteMove && (
                        <span className="text-gray-600 text-xs tabular-nums mr-0.5">{moveNum}.</span>
                      )}
                      <button
                        onClick={() => goToMove(i)}
                        className={`px-2 py-0.5 rounded text-sm font-mono transition-colors ${
                          isActive ? 'bg-indigo-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {san}
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* History nav */}
          {moveHistory.length > 0 && (
            <div className="flex gap-2">
              {[
                { label: '⏮', action: () => goToMove(-1) },
                { label: '◀', action: () => { const i = historyIdx === -1 ? moveHistory.length - 2 : Math.max(-1, historyIdx - 1); goToMove(i); } },
                { label: '▶', action: () => { const i = historyIdx === -1 ? -1 : Math.min(moveHistory.length - 1, historyIdx + 1); goToMove(i); } },
                { label: '⏭', action: () => { setHistoryIdx(-1); setGame(new Chess(fenHistory[fenHistory.length - 1])); } },
              ].map(({ label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="text-gray-500 p-8">Loading...</div>}>
      <AnalysisBoard />
    </Suspense>
  );
}
