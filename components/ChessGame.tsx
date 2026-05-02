'use client';

import { useState, useCallback, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, Square } from 'chess.js';
import { useStockfish } from '@/hooks/useStockfish';
import AICoach from './AICoach';
import ProBanner from './ProBanner';
import Link from 'next/link';

type GameMode = 'pvp' | 'ai';
type DropArgs = {
  piece: { isSparePiece: boolean; position: string; pieceType: string };
  sourceSquare: string;
  targetSquare: string | null;
};

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [mode, setMode] = useState<GameMode>('pvp');
  const [status, setStatus] = useState('White to move');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [difficulty, setDifficulty] = useState(12);

  const updateStatus = useCallback((g: Chess) => {
    if (g.isCheckmate()) {
      setStatus(`Checkmate! ${g.turn() === 'w' ? 'Black' : 'White'} wins 🏆`);
    } else if (g.isDraw()) {
      setStatus('Draw!');
    } else if (g.isCheck()) {
      setStatus(`${g.turn() === 'w' ? 'White' : 'Black'} is in check ⚠️`);
    } else {
      setStatus(`${g.turn() === 'w' ? 'White' : 'Black'} to move`);
    }
  }, []);

  const handleAIMove = useCallback((bestMove: string) => {
    setGame(prev => {
      const g = new Chess(prev.fen());
      try {
        const move = g.move({ from: bestMove.slice(0, 2) as Square, to: bestMove.slice(2, 4) as Square, promotion: bestMove[4] ?? 'q' });
        if (move) setMoveHistory(h => [...h, move.san]);
        updateStatus(g);
      } catch { /* invalid move */ }
      return g;
    });
    setAiThinking(false);
  }, [updateStatus]);

  const { getMove } = useStockfish();

  function makeMove(gameCopy: Chess, san: string) {
    setGame(gameCopy);
    setMoveHistory(prev => [...prev, san]);
    updateStatus(gameCopy);

    if (mode === 'ai' && !gameCopy.isGameOver() && gameCopy.turn() === 'b') {
      setAiThinking(true);
      setTimeout(() => getMove(gameCopy.fen(), 800, handleAIMove), 100);
    }
  }

  function onDrop({ sourceSquare, targetSquare }: DropArgs) {
    if (!targetSquare) return false;
    if (aiThinking) return false;
    if (mode === 'ai' && game.turn() === 'b') return false;

    const gameCopy = new Chess(game.fen());
    try {
      const move = gameCopy.move({ from: sourceSquare as Square, to: targetSquare as Square, promotion: 'q' });
      if (!move) return false;
      makeMove(gameCopy, move.san);
      return true;
    } catch {
      return false;
    }
  }

  function resetGame() {
    setGame(new Chess());
    setMoveHistory([]);
    setStatus('White to move');
    setAiThinking(false);
  }

  const difficultyLabel = difficulty <= 5 ? 'Easy' : difficulty <= 10 ? 'Medium' : difficulty <= 15 ? 'Hard' : 'Master';

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-5xl">
    <div className="flex flex-col lg:flex-row items-start gap-6 w-full">
      {/* Board column */}
      <div className="flex flex-col items-center gap-4 flex-1">
        {/* Mode selector */}
        <div className="flex gap-2 bg-gray-800 rounded-xl p-1">
          {(['pvp', 'ai'] as GameMode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); resetGame(); }}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === m ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              {m === 'pvp' ? '👥 vs Player' : '🤖 vs AI'}
            </button>
          ))}
        </div>

        {/* AI difficulty */}
        {mode === 'ai' && (
          <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2">
            <span className="text-gray-400 text-sm">Difficulty:</span>
            <input
              type="range" min={1} max={20} value={difficulty}
              onChange={e => { setDifficulty(Number(e.target.value)); resetGame(); }}
              className="w-28 accent-indigo-500"
            />
            <span className="text-white text-sm font-semibold w-14">{difficultyLabel}</span>
          </div>
        )}

        {/* Status */}
        <div className="text-base font-semibold text-white bg-gray-800 px-6 py-2 rounded-full">
          {aiThinking ? '🤖 AI is thinking...' : status}
        </div>

        {/* Board */}
        <div className="w-full max-w-[560px]">
          <Chessboard
            options={{
              position: game.fen(),
              onPieceDrop: onDrop,
              boardStyle: { borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' },
              darkSquareStyle: { backgroundColor: '#4a5568' },
              lightSquareStyle: { backgroundColor: '#e2e8f0' },
              allowDragging: !aiThinking,
            }}
          />
        </div>

        {/* Reset */}
        <button
          onClick={resetGame}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
        >
          New Game
        </button>
      </div>

      {/* Move history sidebar */}
      <div className="w-full lg:w-64 flex flex-col gap-4">
        <div className="bg-gray-800 rounded-xl p-4 min-h-[200px]">
          <h3 className="text-gray-400 text-sm font-semibold mb-3 uppercase tracking-wider">Move History</h3>
          {moveHistory.length === 0 ? (
            <p className="text-gray-600 text-sm">No moves yet</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto pr-1">
              {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="text-gray-500 w-6">{i + 1}.</span>
                  <span className="text-white w-16">{moveHistory[i * 2]}</span>
                  <span className="text-gray-300">{moveHistory[i * 2 + 1] ?? ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Multiplayer CTA */}
        <Link href="/play"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-center font-semibold py-3 rounded-xl transition-colors text-sm">
          🌐 Play Multiplayer
        </Link>
      </div>
    </div>

    {/* AI Coach */}
    <AICoach moves={moveHistory} isGameOver={game.isGameOver()} />

    {/* Pro Banner */}
    <ProBanner />
    </div>
  );
}
