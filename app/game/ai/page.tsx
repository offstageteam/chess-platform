'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Chess, Square } from 'chess.js';
import { useStockfish } from '@/hooks/useStockfish';
import AICoach from '@/components/AICoach';
import Link from 'next/link';

const Chessboard = dynamic(() => import('react-chessboard').then(m => m.Chessboard), { ssr: false });

type DropArgs = {
  piece: { isSparePiece: boolean; position: string; pieceType: string };
  sourceSquare: string;
  targetSquare: string | null;
};

type ClickArgs = {
  piece: { pieceType: string } | null;
  square: string;
};

const DIFFICULTY_LEVELS = [
  { label: 'Easy', depth: 3 },
  { label: 'Medium', depth: 8 },
  { label: 'Hard', depth: 14 },
  { label: 'Master', depth: 20 },
];

export default function AIGame() {
  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<Record<string, React.CSSProperties>>({});
  const [difficulty, setDifficulty] = useState(1); // index into DIFFICULTY_LEVELS
  const [aiThinking, setAiThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState('');
  const [started, setStarted] = useState(false);
  const { getMove } = useStockfish();

  const getStatus = (g: Chess) => {
    if (g.isCheckmate()) return `Checkmate — ${g.turn() === 'w' ? 'Black' : 'White'} wins!`;
    if (g.isStalemate()) return 'Stalemate — Draw';
    if (g.isDraw()) return 'Draw';
    if (g.isCheck()) return `${g.turn() === 'w' ? 'White' : 'Black'} is in check!`;
    return `${g.turn() === 'w' ? 'White' : 'Black'} to move`;
  };

  const triggerAI = useCallback((fen: string) => {
    setAiThinking(true);
    const depth = DIFFICULTY_LEVELS[difficulty].depth;
    getMove(fen, depth, (bestMove) => {
      setGame(prev => {
        const g = new Chess(prev.fen());
        try {
          const move = g.move({
            from: bestMove.slice(0, 2) as Square,
            to: bestMove.slice(2, 4) as Square,
            promotion: bestMove[4] ?? 'q',
          });
          if (move) {
            setMoveHistory(h => [...h, move.san]);
            if (g.isGameOver()) {
              setGameOver(true);
              setGameResult(getStatus(g));
            }
          }
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
    if (g.isGameOver()) {
      setGameOver(true);
      setGameResult(getStatus(g));
      return;
    }
    if (g.turn() === 'b') triggerAI(g.fen());
  }

  function onSquareClick({ square }: ClickArgs) {
    if (aiThinking || game.turn() !== 'w' || gameOver) return;

    // If a piece is already selected, try to move
    if (selectedSquare && selectedSquare !== square) {
      const g = new Chess(game.fen());
      try {
        const move = g.move({ from: selectedSquare as Square, to: square as Square, promotion: 'q' });
        if (move) { applyMove(g, move.san); return; }
      } catch { /* not a valid move, fall through to select */ }
    }

    // Select the clicked square if it has a white piece
    const piece = game.get(square as Square);
    if (piece && piece.color === 'w') {
      setSelectedSquare(square);
      const moves = game.moves({ square: square as Square, verbose: true });
      const highlights: Record<string, React.CSSProperties> = {
        [square]: { backgroundColor: 'rgba(99,102,241,0.5)' },
      };
      moves.forEach(m => {
        highlights[m.to] = { backgroundColor: 'rgba(99,102,241,0.25)', borderRadius: '50%' };
      });
      setLegalMoves(highlights);
    } else {
      setSelectedSquare(null);
      setLegalMoves({});
    }
  }

  function onDrop({ sourceSquare, targetSquare }: DropArgs) {
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
    setGame(new Chess());
    setMoveHistory([]);
    setGameOver(false);
    setGameResult('');
    setSelectedSquare(null);
    setLegalMoves({});
    setAiThinking(false);
    setStarted(false);
  }

  if (!started) {
    return (
      <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-10 w-full max-w-md text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h1 className="text-3xl font-bold text-white mb-2">vs AI</h1>
          <p className="text-gray-400 mb-8">Choose your difficulty and play as White</p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {DIFFICULTY_LEVELS.map((d, i) => (
              <button key={d.label} onClick={() => setDifficulty(i)}
                className={`py-3 rounded-xl font-semibold transition-colors ${
                  difficulty === i ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}>
                {d.label}
              </button>
            ))}
          </div>

          <button onClick={() => setStarted(true)}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-lg transition-colors">
            Start Game
          </button>
          <Link href="/game" className="block mt-4 text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← Back to lobby
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col items-center py-8 px-4 gap-4">
      {/* Game over modal */}
      {gameOver && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center max-w-sm w-full">
            <div className="text-5xl mb-4">{gameResult.includes('White') ? '🏆' : gameResult.includes('Black') ? '😔' : '🤝'}</div>
            <h2 className="text-2xl font-bold text-white mb-2">{gameResult}</h2>
            <p className="text-gray-400 mb-6">{moveHistory.length} moves played</p>
            <div className="flex flex-col gap-3">
              <button onClick={resetGame}
                className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
                Play Again
              </button>
              <Link href="/game" className="py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors text-center">
                Back to Lobby
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-5xl">
        {/* Board column */}
        <div className="flex flex-col items-center gap-3 flex-1">
          {/* AI info bar */}
          <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2 w-full max-w-[560px]">
            <span className="text-2xl">🤖</span>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">Stockfish AI · {DIFFICULTY_LEVELS[difficulty].label}</p>
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
                squareStyles: legalMoves,
                boardStyle: { borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' },
                darkSquareStyle: { backgroundColor: '#4a5568' },
                lightSquareStyle: { backgroundColor: '#e2e8f0' },
                allowDragging: !aiThinking && !gameOver,
              }}
            />
          </div>

          {/* Player info bar */}
          <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2 w-full max-w-[560px]">
            <span className="text-2xl">👤</span>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">You</p>
              <p className="text-gray-400 text-xs">White</p>
            </div>
            {!aiThinking && !gameOver && game.turn() === 'w' && (
              <span className="text-green-400 text-xs font-semibold">Your turn</span>
            )}
          </div>

          <button onClick={resetGame}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-colors">
            New Game
          </button>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-64 flex flex-col gap-4">
          {/* Status */}
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Status</p>
            <p className="text-white font-semibold">{aiThinking ? '🤖 AI is thinking...' : getStatus(game)}</p>
          </div>

          {/* Move history */}
          <div className="bg-gray-800 rounded-xl p-4 flex-1">
            <h3 className="text-gray-400 text-xs font-semibold mb-3 uppercase tracking-wider">Moves</h3>
            {moveHistory.length === 0 ? (
              <p className="text-gray-600 text-sm">No moves yet</p>
            ) : (
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

          <Link href="/game" className="text-center text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← Back to lobby
          </Link>
        </div>
      </div>

      <AICoach moves={moveHistory} isGameOver={game.isGameOver()} />
    </main>
  );
}
