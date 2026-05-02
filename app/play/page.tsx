'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Chess, Square } from 'chess.js';
import { useSearchParams, useRouter } from 'next/navigation';
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

function getPlayerId(roomId: string): string {
  const key = `chess-pid-${roomId}`;
  let id = localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
  return id;
}

function MultiplayerGame() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = searchParams.get('room');

  const [game, setGame] = useState(new Chess());
  const [myColor, setMyColor] = useState<'white' | 'black' | null>(null);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [status, setStatus] = useState('');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<Record<string, React.CSSProperties>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myColorRef = useRef<'white' | 'black' | null>(null);

  const getGameStatus = (g: Chess, color: 'white' | 'black') => {
    if (g.isCheckmate()) return `Checkmate — ${g.turn() === 'w' ? 'Black' : 'White'} wins!`;
    if (g.isDraw()) return 'Draw!';
    if (g.isCheck()) return `${g.turn() === 'w' ? 'White' : 'Black'} is in check!`;
    const myTurn = (g.turn() === 'w' && color === 'white') || (g.turn() === 'b' && color === 'black');
    return myTurn ? 'Your turn' : "Opponent's turn";
  };

  useEffect(() => {
    if (!roomId) return;

    async function joinRoom() {
      const playerId = getPlayerId(roomId!);

      // Check existing room
      const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single();

      let color: 'white' | 'black';

      if (!room) {
        // Create room as white
        await supabase.from('rooms').insert({ id: roomId, white_player: playerId, status: 'waiting' });
        color = 'white';
      } else if (room.white_player === playerId) {
        color = 'white';
        if (room.black_player) setOpponentJoined(true);
      } else if (!room.black_player) {
        // Join as black
        await supabase.from('rooms').update({ black_player: playerId, status: 'playing' }).eq('id', roomId);
        color = 'black';
        setOpponentJoined(true);
      } else if (room.black_player === playerId) {
        color = 'black';
        setOpponentJoined(true);
      } else {
        // Room full
        setStatus('Room is full');
        return;
      }

      setMyColor(color);
      myColorRef.current = color;
      setStatus(color === 'white' && !room?.black_player ? 'Waiting for opponent...' : getGameStatus(new Chess(), color));

      // Subscribe to realtime moves
      const channel = supabase.channel(`room:${roomId}`);
      channelRef.current = channel;

      channel
        .on('broadcast', { event: 'move' }, ({ payload }) => {
          setGame(prev => {
            const g = new Chess(prev.fen());
            try {
              const move = g.move({ from: payload.from, to: payload.to, promotion: payload.promotion ?? 'q' });
              if (move) {
                setMoveHistory(h => [...h, move.san]);
                const col = myColorRef.current!;
                if (g.isGameOver()) {
                  setGameOver(true);
                  setGameResult(getGameStatus(g, col));
                } else {
                  setStatus(getGameStatus(g, col));
                }
              }
            } catch { /* ignore */ }
            return g;
          });
        })
        .on('broadcast', { event: 'opponent_joined' }, () => {
          setOpponentJoined(true);
          setStatus(getGameStatus(new Chess(), myColorRef.current!));
        })
        .subscribe();

      // If I'm black, notify white
      if (color === 'black') {
        setTimeout(() => {
          channel.send({ type: 'broadcast', event: 'opponent_joined', payload: {} });
        }, 500);
      }
    }

    joinRoom();

    return () => { channelRef.current?.unsubscribe(); };
  }, [roomId]);

  function sendMove(from: string, to: string, promotion = 'q') {
    channelRef.current?.send({ type: 'broadcast', event: 'move', payload: { from, to, promotion } });
  }

  function onSquareClick({ square }: ClickArgs) {
    if (!myColor || !opponentJoined || gameOver) return;
    const isMyTurn = (game.turn() === 'w' && myColor === 'white') || (game.turn() === 'b' && myColor === 'black');
    if (!isMyTurn) return;

    if (selectedSquare && selectedSquare !== square) {
      const g = new Chess(game.fen());
      try {
        const move = g.move({ from: selectedSquare as Square, to: square as Square, promotion: 'q' });
        if (move) {
          sendMove(selectedSquare, square);
          setGame(g);
          setMoveHistory(h => [...h, move.san]);
          setSelectedSquare(null);
          setLegalMoves({});
          if (g.isGameOver()) { setGameOver(true); setGameResult(getGameStatus(g, myColor)); }
          else setStatus(getGameStatus(g, myColor));
          return;
        }
      } catch { /* fall through */ }
    }

    const piece = game.get(square as Square);
    const myPieceColor = myColor === 'white' ? 'w' : 'b';
    if (piece && piece.color === myPieceColor) {
      setSelectedSquare(square);
      const moves = game.moves({ square: square as Square, verbose: true });
      const h: Record<string, React.CSSProperties> = { [square]: { backgroundColor: 'rgba(34,197,94,0.5)' } };
      moves.forEach(m => { h[m.to] = { backgroundColor: 'rgba(34,197,94,0.25)', borderRadius: '50%' }; });
      setLegalMoves(h);
    } else {
      setSelectedSquare(null);
      setLegalMoves({});
    }
  }

  function onDrop({ sourceSquare, targetSquare }: DropArgs) {
    if (!targetSquare || !myColor || !opponentJoined || gameOver) return false;
    const isMyTurn = (game.turn() === 'w' && myColor === 'white') || (game.turn() === 'b' && myColor === 'black');
    if (!isMyTurn) return false;

    const g = new Chess(game.fen());
    try {
      const move = g.move({ from: sourceSquare as Square, to: targetSquare as Square, promotion: 'q' });
      if (!move) return false;
      sendMove(sourceSquare, targetSquare);
      setGame(g);
      setMoveHistory(h => [...h, move.san]);
      setSelectedSquare(null);
      setLegalMoves({});
      if (g.isGameOver()) { setGameOver(true); setGameResult(getGameStatus(g, myColor)); }
      else setStatus(getGameStatus(g, myColor));
      return true;
    } catch { return false; }
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/play?room=${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Lobby — no room selected
  if (!roomId) {
    return (
      <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-10 w-full max-w-md text-center">
          <div className="text-6xl mb-4">🌐</div>
          <h1 className="text-3xl font-bold text-white mb-2">Multiplayer</h1>
          <p className="text-gray-400 mb-8">Create a room and share the link with a friend</p>
          <button
            onClick={() => {
              const code = Math.random().toString(36).slice(2, 8).toUpperCase();
              router.push(`/play?room=${code}`);
            }}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-lg transition-colors"
          >
            Create Room
          </button>
          <Link href="/game" className="block mt-4 text-gray-500 hover:text-gray-300 text-sm">
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
            <div className="text-5xl mb-4">🏁</div>
            <h2 className="text-2xl font-bold text-white mb-2">{gameResult}</h2>
            <p className="text-gray-400 mb-6">{moveHistory.length} moves played</p>
            <Link href="/game" className="block py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
              Back to Lobby
            </Link>
          </div>
        </div>
      )}

      {/* Waiting overlay */}
      {!opponentJoined && myColor === 'white' && (
        <div className="w-full max-w-lg bg-gray-800 border border-gray-700 rounded-2xl p-6 text-center">
          <div className="text-3xl mb-2 animate-pulse">⏳</div>
          <p className="text-white font-semibold mb-1">Waiting for opponent...</p>
          <p className="text-gray-400 text-sm mb-4">Share this link with your friend:</p>
          <div className="flex gap-2">
            <input readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/play?room=${roomId}`}
              className="flex-1 bg-gray-700 text-white text-sm px-3 py-2 rounded-lg outline-none" />
            <button onClick={copyLink}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-5xl">
        {/* Board */}
        <div className="flex flex-col items-center gap-3 flex-1">
          {/* Opponent bar */}
          <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2 w-full max-w-[560px]">
            <span className="text-2xl">{opponentJoined ? '👤' : '⏳'}</span>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">{opponentJoined ? 'Opponent' : 'Waiting...'}</p>
              <p className="text-gray-400 text-xs">{myColor === 'white' ? 'Black' : 'White'}</p>
            </div>
          </div>

          <div className="w-full max-w-[560px]">
            <Chessboard
              options={{
                position: game.fen(),
                onPieceDrop: onDrop,
                onSquareClick: onSquareClick,
                squareStyles: legalMoves,
                boardOrientation: myColor ?? 'white',
                boardStyle: { borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' },
                darkSquareStyle: { backgroundColor: '#4a5568' },
                lightSquareStyle: { backgroundColor: '#e2e8f0' },
                allowDragging: opponentJoined && !gameOver,
              }}
            />
          </div>

          {/* My bar */}
          <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2 w-full max-w-[560px]">
            <span className="text-2xl">👤</span>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">You</p>
              <p className="text-gray-400 text-xs">{myColor ?? '...'}</p>
            </div>
            {opponentJoined && !gameOver && ((game.turn() === 'w' && myColor === 'white') || (game.turn() === 'b' && myColor === 'black')) && (
              <span className="text-green-400 text-xs font-semibold">Your turn</span>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-64 flex flex-col gap-4">
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Status</p>
            <p className="text-white font-semibold text-sm">{status}</p>
          </div>

          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Room</p>
            <p className="text-white font-mono font-bold">{roomId}</p>
            <button onClick={copyLink}
              className="mt-2 text-indigo-400 hover:text-indigo-300 text-xs underline">
              {copied ? 'Copied!' : 'Copy invite link'}
            </button>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 flex-1">
            <h3 className="text-gray-400 text-xs font-semibold mb-3 uppercase tracking-wider">Moves</h3>
            {moveHistory.length === 0 ? (
              <p className="text-gray-600 text-sm">No moves yet</p>
            ) : (
              <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
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
    </main>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="text-white text-center py-20">Loading...</div>}>
      <MultiplayerGame />
    </Suspense>
  );
}
