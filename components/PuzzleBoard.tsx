'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Chess, Square } from 'chess.js';
import type { Puzzle } from '@/lib/puzzles';
import { useLang } from '@/context/LangContext';

const Chessboard = dynamic(() => import('react-chessboard').then(m => m.Chessboard), { ssr: false });

interface Props {
  puzzle: Puzzle;
  onSolved: () => void;
}

type Status = 'idle' | 'correct' | 'wrong';

export default function PuzzleBoard({ puzzle, onSolved }: Props) {
  const { t } = useLang();
  const [game, setGame] = useState(new Chess(puzzle.fen));
  const [status, setStatus] = useState<Status>('idle');
  const [showSolution, setShowSolution] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<Record<string, React.CSSProperties>>({});
  const [solved, setSolved] = useState(false);

  const isBlackToMove = puzzle.fen.split(' ')[1] === 'b';
  const boardOrientation = isBlackToMove ? 'black' : 'white';

  function highlightMoves(square: string) {
    const g = new Chess(game.fen());
    const moves = g.moves({ square: square as Square, verbose: true });
    if (!moves.length) { setLegalMoves({}); return; }
    const h: Record<string, React.CSSProperties> = {
      [square]: { backgroundColor: 'rgba(201,150,42,0.45)' },
    };
    moves.forEach(m => {
      h[m.to] = { backgroundColor: 'rgba(201,150,42,0.25)', borderRadius: '50%' };
    });
    setLegalMoves(h);
  }

  function tryMove(from: string, to: string) {
    if (solved) return false;
    const g = new Chess(game.fen());
    try {
      const move = g.move({ from: from as Square, to: to as Square, promotion: 'q' });
      if (!move) return false;
      const uci = `${from}${to}`;
      if (uci === puzzle.solution) {
        setGame(g);
        setStatus('correct');
        setSolved(true);
        setSelectedSquare(null);
        setLegalMoves({});
        setTimeout(onSolved, 1200);
      } else {
        setStatus('wrong');
        setTimeout(() => setStatus('idle'), 1000);
      }
      return true;
    } catch {
      return false;
    }
  }

  const onDrop = useCallback(({ sourceSquare, targetSquare }: { piece: unknown; sourceSquare: string; targetSquare: string | null }) => {
    if (!targetSquare) return false;
    setSelectedSquare(null);
    setLegalMoves({});
    return tryMove(sourceSquare, targetSquare);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, puzzle, solved]);

  function onSquareClick({ square }: { piece: unknown; square: string }) {
    if (solved) return;
    if (selectedSquare && selectedSquare !== square) {
      if (tryMove(selectedSquare, square)) return;
    }
    const piece = game.get(square as Square);
    const sideToMove = game.turn();
    if (piece && piece.color === sideToMove) {
      setSelectedSquare(square);
      highlightMoves(square);
    } else {
      setSelectedSquare(null);
      setLegalMoves({});
    }
  }

  const feedbackBg =
    status === 'correct' ? 'bg-green-900/60 border-green-600 text-green-300' :
    status === 'wrong'   ? 'bg-red-900/60 border-red-600 text-red-300' :
                           'bg-gray-800 border-gray-700 text-gray-400';

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Board */}
      <div className="w-full max-w-[480px]">
        <Chessboard
          options={{
            position: game.fen(),
            boardOrientation,
            onPieceDrop: onDrop,
            onSquareClick,
            squareStyles: legalMoves,
            animationDurationInMs: 200,
          }}
        />
      </div>

      {/* Status bar */}
      <div className={`w-full max-w-[480px] rounded-xl px-4 py-3 border text-sm font-semibold text-center transition-all ${feedbackBg}`}>
        {status === 'correct' ? t('correct') :
         status === 'wrong'   ? t('tryAgain') :
         solved               ? t('correct') :
                                t('yourTurn')}
      </div>

      {/* Show solution */}
      {!solved && (
        <button
          onClick={() => setShowSolution(s => !s)}
          className="text-gray-500 hover:text-gray-300 text-sm underline transition-colors"
        >
          {t('showSolution')}
        </button>
      )}
      {showSolution && !solved && (
        <p className="text-gray-400 text-sm">
          {t('solution')} <span className="text-indigo-400 font-bold font-mono">{puzzle.solutionSan}</span>
          {' '}— {puzzle.theme}
        </p>
      )}
    </div>
  );
}
