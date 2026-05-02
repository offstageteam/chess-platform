'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Chess, Square } from 'chess.js';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

const Chessboard = dynamic(() => import('react-chessboard').then(m => m.Chessboard), { ssr: false });

type DropArgs = {
  piece: { isSparePiece: boolean; position: string; pieceType: string };
  sourceSquare: string;
  targetSquare: string | null;
};

function MultiplayerGame() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = searchParams.get('room');

  const [game, setGame] = useState(new Chess());
  const [myColor, setMyColor] = useState<'white' | 'black' | null>(null);
  const [status, setStatus] = useState('Waiting for opponent...');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [roomCode, setRoomCode] = useState(roomId ?? '');

  const updateStatus = useCallback((g: Chess, color: 'white' | 'black') => {
    if (g.isCheckmate()) {
      setStatus(`Checkmate! ${g.turn() === 'w' ? 'Black' : 'White'} wins 🏆`);
    } else if (g.isDraw()) {
      setStatus('Draw!');
    } else if (g.isCheck()) {
      setStatus(`${g.turn() === 'w' ? 'White' : 'Black'} is in check ⚠️`);
    } else {
      const myTurn = (g.turn() === 'w' && color === 'white') || (g.turn() === 'b' && color === 'black');
      setStatus(myTurn ? 'Your turn' : "Opponent's turn");
    }
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`chess-room-${roomId}`, {
      config: { presence: { key: roomId } },
    });

    let assignedColor: 'white' | 'black' = 'white';

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        if (count >= 2 && !myColor) {
          assignedColor = 'black';
          setMyColor('black');
        }
      })
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        setGame(prev => {
          const g = new Chess(prev.fen());
          try {
            const move = g.move({ from: payload.from, to: payload.to, promotion: payload.promotion ?? 'q' });
            if (move) {
              setMoveHistory(h => [...h, move.san]);
              updateStatus(g, assignedColor);
            }
          } catch { /* ignore */ }
          return g;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ joined_at: Date.now() });
          const state = channel.presenceState();
          const count = Object.keys(state).length;
          assignedColor = count <= 1 ? 'white' : 'black';
          setMyColor(assignedColor);
          setStatus(count <= 1 ? 'Waiting for opponent...' : assignedColor === 'white' ? 'Your turn' : "Opponent's turn");
        }
      });

    return () => { channel.unsubscribe(); };
  }, [roomId, myColor, updateStatus]);

  function onDrop({ sourceSquare, targetSquare }: DropArgs) {
    if (!targetSquare || !myColor || !roomId) return false;
    const isMyTurn = (game.turn() === 'w' && myColor === 'white') || (game.turn() === 'b' && myColor === 'black');
    if (!isMyTurn) return false;

    const gameCopy = new Chess(game.fen());
    try {
      const move = gameCopy.move({ from: sourceSquare as Square, to: targetSquare as Square, promotion: 'q' });
      if (!move) return false;

      supabase.channel(`chess-room-${roomId}`).send({
        type: 'broadcast',
        event: 'move',
        payload: { from: sourceSquare, to: targetSquare, promotion: 'q' },
      });

      setGame(gameCopy);
      setMoveHistory(prev => [...prev, move.san]);
      updateStatus(gameCopy, myColor);
      return true;
    } catch {
      return false;
    }
  }

  function createRoom() {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    router.push(`/play?room=${code}`);
  }

  if (!roomId) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 px-4">
        <h1 className="text-3xl font-bold text-white">Multiplayer</h1>
        <p className="text-gray-400">Create a room and share the link with your friend</p>
        <button
          onClick={createRoom}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-lg transition-colors"
        >
          Create Room
        </button>
      </div>
    );
  }

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/play?room=${roomId}` : '';

  return (
    <div className="flex flex-col items-center gap-5 py-8 px-4">
      <div className="bg-gray-800 rounded-xl px-5 py-3 flex items-center gap-3">
        <span className="text-gray-400 text-sm">Room:</span>
        <span className="text-white font-mono font-bold">{roomId}</span>
        <button
          onClick={() => navigator.clipboard.writeText(shareUrl)}
          className="text-indigo-400 hover:text-indigo-300 text-sm underline"
        >
          Copy invite link
        </button>
      </div>

      <div className="text-base font-semibold text-white bg-gray-800 px-6 py-2 rounded-full">
        {myColor ? `You are ${myColor} · ${status}` : 'Connecting...'}
      </div>

      <div className="w-full max-w-[520px]">
        <Chessboard
          options={{
            position: game.fen(),
            onPieceDrop: onDrop,
            boardOrientation: myColor ?? 'white',
            boardStyle: { borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' },
            darkSquareStyle: { backgroundColor: '#4a5568' },
            lightSquareStyle: { backgroundColor: '#e2e8f0' },
          }}
        />
      </div>

      {moveHistory.length > 0 && (
        <div className="w-full max-w-[520px] bg-gray-800 rounded-xl p-4">
          <h3 className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wider">Moves</h3>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
            {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="text-gray-500 w-6">{i + 1}.</span>
                <span className="text-white w-16">{moveHistory[i * 2]}</span>
                <span className="text-gray-300">{moveHistory[i * 2 + 1] ?? ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="text-white text-center py-20">Loading...</div>}>
      <MultiplayerGame />
    </Suspense>
  );
}
