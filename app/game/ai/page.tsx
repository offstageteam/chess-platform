'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Chess, Square } from 'chess.js';
import { useStockfish } from '@/hooks/useStockfish';
import AICoach from '@/components/AICoach';
import Link from 'next/link';

const Chessboard = dynamic(() => import('react-chessboard').then(m => m.Chessboard), { ssr: false });

type DropArgs = { piece: unknown; sourceSquare: string; targetSquare: string | null };
type SquareArgs = { piece: { pieceType: string } | null; square: string };
type DragArgs = { isSparePiece: boolean; piece: unknown; square: string | null };

// movetime in ms — how long AI thinks per move
const DIFFICULTIES = [
  { label: 'Easy', movetime: 200 },
  { label: 'Medium', movetime: 800 },
  { label: 'Hard', movetime: 2000 },
  { label: 'Master', movetime: 5000 },
];

const TIME_OPTIONS = [
  { label: '1 min', value: 1 },
  { label: '3 min', value: 3 },
  { label: '5 min', value: 5 },
  { label: '∞', value: 0 },
];

function formatTime(secs: number) {
  if (secs <= 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AIGame() {
  const [game, setGame] = useState(new Chess());
  const [difficulty, setDifficulty] = useState(0);
  const [timeControl, setTimeControl] = useState(5); // minutes, 0 = unlimited
  const [started, setStarted] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState('');
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<Record<string, React.CSSProperties>>({});
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const { getMove } = useStockfish();
  const gameRef = useRef(game);
  gameRef.current = game;

  // Timer — only counts down when it's the human's (white) turn
  useEffect(() => {
    if (!started || gameOver || timeControl === 0) return;
    if (gameRef.current.turn() !== 'w') return; // AI's turn — don't tick
    const id = setInterval(() => {
      setWhiteTime(t => {
        if (t <= 1) { clearInterval(id); endGame('Time out — You lost! ⏰'); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [game, started, gameOver, timeControl]);

  function endGame(result: string) {
    setGameOver(true);
    setGameResult(result);
  }

  function getStatus(g: Chess) {
    if (g.isCheckmate()) return `Checkmate — ${g.turn() === 'w' ? 'Black' : 'White'} wins! 🏆`;
    if (g.isDraw()) return 'Draw!';
    if (g.isCheck()) return `${g.turn() === 'w' ? 'White' : 'Black'} is in check!`;
    return `${g.turn() === 'w' ? 'White' : 'Black'} to move`;
  }

  const triggerAI = useCallback((fen: string) => {
    setAiThinking(true);
    getMove(fen, DIFFICULTIES[difficulty].movetime, (bestMove) => {
      setGame(prev => {
        const g = new Chess(prev.fen());
        try {
          const move = g.move({
            from: bestMove.slice(0, 2) as Square,
            to: bestMove.slice(2, 4) as Square,
            promotion: bestMove[4] ?? 'q',
          });
          if (move) setMoveHistory(h => [...h, move.san]);
          if (g.isGameOver()) endGame(getStatus(g));
        } catch { /* ignore */ }
        return g;
      });
      setAiThinking(false);
    });
  }, [difficulty, getMove]);

  function applyMove(g: Chess, san: string) {
    setGame(g);
    setMoveHistory(h => [...h, san]);
    setSelectedSquare(null);
    setLegalMoves({});
    if (g.isGameOver()) { endGame(getStatus(g)); return; }
    if (g.turn() === 'b') triggerAI(g.fen());
  }

  // Show legal moves for a square
  function highlightMoves(square: string) {
    const moves = game.moves({ square: square as Square, verbose: true });
    if (!moves.length) { setLegalMoves({}); return; }
    const h: Record<string, React.CSSProperties> = {
      [square]: { backgroundColor: 'rgba(99,102,241,0.5)' },
    };
    moves.forEach(m => { h[m.to] = { backgroundColor: 'rgba(99,102,241,0.3)', borderRadius: '50%' }; });
    setLegalMoves(h);
  }

  function onPieceDrag({ square }: DragArgs) {
    if (!square) return;
    const piece = game.get(square as Square);
    if (piece?.color === 'w') highlightMoves(square);
  }

  function onSquareClick({ square }: SquareArgs) {
    if (aiThinking || game.turn() !== 'w' || gameOver) return;
    if (selectedSquare && selectedSquare !== square) {
      const g = new Chess(game.fen());
      try {
        const move = g.move({ from: selectedSquare as Square, to: square as Square, promotion: 'q' });
        if (move) { applyMove(g, move.san); return; }
      } catch { /* fall through */ }
    }
    const piece = game.get(square as Square);
    if (piece?.color === 'w') {
      setSelectedSquare(square);
      highlightMoves(square);
    } else {
      setSelectedSquare(null);
      setLegalMoves({});
    }
  }

  function onDrop({ sourceSquare, targetSquare }: DropArgs) {
    setLegalMoves({});
    if (!targetSquare || aiThinking || game.turn() !== 'w' || gameOver) return false;
    const g = new Chess(game.fen());
    try {
      const move = g.move({ from: sourceSquare as Square, to: targetSquare as Square, promotion: 'q' });
      if (!move) return false;
      applyMove(g, move.san);
      return true;
    } catch { return false; }
  }

  function resetGame() {
    const tc = timeControl * 60;
    setGame(new Chess());
    setMoveHistory([]);
    setGameOver(false);
    setGameResult('');
    setSelectedSquare(null);
    setLegalMoves({});
    setAiThinking(false);
    setWhiteTime(tc);
    setBlackTime(tc);
    setStarted(false);
  }

  function forfeit() {
    endGame('You forfeited — Black wins!');
  }

  // ── Setup screen ─────────────────────────────────────────────────────────────
  if (!started) return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 rounded-2xl p-10 w-full max-w-md text-center">
        <div className="text-6xl mb-4">🤖</div>
        <h1 className="text-3xl font-bold text-white mb-2">vs AI</h1>
        <p className="text-gray-400 mb-8">You play as White</p>

        <p className="text-gray-400 text-sm mb-2">Difficulty</p>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {DIFFICULTIES.map((d, i) => (
            <button key={d.label} onClick={() => setDifficulty(i)}
              className={`py-3 rounded-xl font-semibold text-sm transition-colors ${difficulty === i ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              {d.label}
            </button>
          ))}
        </div>

        <p className="text-gray-400 text-sm mb-2">Time control</p>
        <div className="grid grid-cols-4 gap-2 mb-8">
          {TIME_OPTIONS.map(t => (
            <button key={t.label} onClick={() => setTimeControl(t.value)}
              className={`py-3 rounded-xl font-semibold text-sm transition-colors ${timeControl === t.value ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <button onClick={() => {
          const secs = timeControl * 60;
          setWhiteTime(secs);
          setBlackTime(secs);
          setStarted(true);
        }} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-lg transition-colors">
          Start Game
        </button>
        <Link href="/game" className="block mt-4 text-gray-500 hover:text-gray-300 text-sm">← Back to lobby</Link>
      </div>
    </main>
  );

  // ── Game screen ───────────────────────────────────────────────────────────────
  const status = aiThinking ? '🤖 AI is thinking...' : getStatus(game);
  const whiteLow = timeControl > 0 && whiteTime <= 30;
  const blackLow = timeControl > 0 && blackTime <= 30;

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col items-center py-8 px-4 gap-4">
      {/* Game over modal */}
      {gameOver && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center max-w-sm w-full">
            <div className="text-5xl mb-4">{gameResult.includes('White') ? '🏆' : gameResult.includes('Black') && !gameResult.includes('forfeited') ? '😔' : gameResult.includes('forfeited') ? '🏳️' : '🤝'}</div>
            <h2 className="text-2xl font-bold text-white mb-2">{gameResult}</h2>
            <p className="text-gray-400 mb-6">{moveHistory.length} moves played</p>
            <div className="flex flex-col gap-3">
              <button onClick={resetGame} className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">Play Again</button>
              <Link href="/game" className="py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl text-center">Back to Lobby</Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-5xl">
        <div className="flex flex-col items-center gap-3 flex-1">
          {/* AI clock */}
          <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2 w-full max-w-[560px]">
            <span className="text-2xl">🤖</span>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">Stockfish · {DIFFICULTIES[difficulty].label}</p>
              <p className="text-gray-400 text-xs">Black</p>
            </div>
            {aiThinking && <span className="text-indigo-400 text-xs animate-pulse">Thinking...</span>}
          </div>

          {/* Board */}
          <div className="w-full max-w-[560px]">
            <Chessboard
              options={{
                position: game.fen(),
                onPieceDrop: onDrop,
                onSquareClick: onSquareClick,
                onPieceDrag: onPieceDrag,
                squareStyles: legalMoves,
                boardStyle: { borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' },
                darkSquareStyle: { backgroundColor: '#4a5568' },
                lightSquareStyle: { backgroundColor: '#e2e8f0' },
                allowDragging: !aiThinking && !gameOver && game.turn() === 'w',
              }}
            />
          </div>

          {/* Player clock */}
          <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2 w-full max-w-[560px]">
            <span className="text-2xl">👤</span>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">You · White</p>
              {!aiThinking && !gameOver && game.turn() === 'w' && <p className="text-green-400 text-xs">Your turn</p>}
            </div>
            {timeControl > 0 && (
              <span className={`font-mono font-bold text-lg ${whiteLow ? 'text-red-400 animate-pulse' : game.turn() === 'w' && !gameOver ? 'text-white' : 'text-gray-500'}`}>
                {formatTime(whiteTime)}
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={resetGame} className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-colors">
              New Game
            </button>
            {!gameOver && (
              <button onClick={forfeit} className="px-5 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors">
                🏳 Forfeit
              </button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-64 flex flex-col gap-4">
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Status</p>
            <p className="text-white font-semibold text-sm">{status}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 flex-1">
            <h3 className="text-gray-400 text-xs font-semibold mb-3 uppercase tracking-wider">Moves</h3>
            {moveHistory.length === 0 ? <p className="text-gray-600 text-sm">No moves yet</p> : (
              <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
                {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className="text-gray-500 w-6 shrink-0">{i + 1}.</span>
                    <span className="text-white w-16">{moveHistory[i * 2]}</span>
                    <span className="text-gray-300">{moveHistory[i * 2 + 1] ?? ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Link href="/game" className="text-center text-gray-500 hover:text-gray-300 text-sm">← Back to lobby</Link>
        </div>
      </div>

      <AICoach moves={moveHistory} isGameOver={game.isGameOver() || gameOver} />
    </main>
  );
}
