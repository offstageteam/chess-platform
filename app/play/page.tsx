'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Chess, Square } from 'chess.js';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const Chessboard = dynamic(() => import('react-chessboard').then(m => m.Chessboard), { ssr: false });

type Color = 'white' | 'black';
type Phase = 'loading' | 'create' | 'waiting' | 'join' | 'playing' | 'full';
type DropArgs = { piece: unknown; sourceSquare: string; targetSquare: string | null };
type ClickArgs = { piece: { pieceType: string } | null; square: string };
type DragArgs = { isSparePiece: boolean; piece: unknown; square: string | null };

interface Room {
  id: string;
  white_player: string | null;
  black_player: string | null;
  status: string;
  time_control: number;
}

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

  const [phase, setPhase] = useState<Phase>('loading');
  const [myColor, setMyColor] = useState<Color>('white');
  const [pickedColor, setPickedColor] = useState<Color>('white');
  const [timeControl, setTimeControl] = useState(5);
  const [room, setRoom] = useState<Room | null>(null);
  const [copied, setCopied] = useState(false);

  const [game, setGame] = useState(new Chess());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState('');
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<Record<string, React.CSSProperties>>({});
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myColorRef = useRef<Color>('white');
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const gameRef = useRef(game);
  gameRef.current = game;
  const timeControlRef = useRef(timeControl);

  // Timer — restarts on each move
  useEffect(() => {
    if (phase !== 'playing' || gameOver || timeControlRef.current === 0) return;
    const id = setInterval(() => {
      const turn = gameRef.current.turn();
      if (turn === 'w') {
        setWhiteTime(t => {
          if (t <= 1) {
            clearInterval(id);
            channelRef.current?.send({ type: 'broadcast', event: 'timeout', payload: { loser: 'white' } });
            endGame('Time out — Black wins! ⏰');
            return 0;
          }
          return t - 1;
        });
      } else {
        setBlackTime(t => {
          if (t <= 1) {
            clearInterval(id);
            channelRef.current?.send({ type: 'broadcast', event: 'timeout', payload: { loser: 'black' } });
            endGame('Time out — White wins! ⏰');
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [game, phase, gameOver]);

  function endGame(result: string) {
    setGameOver(true);
    setGameResult(result);
  }

  const getGameStatus = useCallback((g: Chess, color: Color) => {
    if (g.isCheckmate()) return `Checkmate — ${g.turn() === 'w' ? 'Black' : 'White'} wins! 🏆`;
    if (g.isDraw()) return 'Draw!';
    if (g.isCheck()) return `${g.turn() === 'w' ? 'White' : 'Black'} is in check!`;
    const myTurn = (g.turn() === 'w' && color === 'white') || (g.turn() === 'b' && color === 'black');
    return myTurn ? '🟢 Your turn' : "⏳ Opponent's turn";
  }, []);

  const startGame = useCallback((id: string, color: Color, tc: number) => {
    myColorRef.current = color;
    timeControlRef.current = tc;
    setMyColor(color);
    setTimeControl(tc);
    const secs = tc * 60;
    setWhiteTime(secs);
    setBlackTime(secs);
    setPhase('playing');
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }

    const channel = supabase.channel(`chess-moves-${id}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        setGame(prev => {
          const g = new Chess(prev.fen());
          try {
            const move = g.move({ from: payload.from, to: payload.to, promotion: payload.promotion ?? 'q' });
            if (move) {
              setMoveHistory(h => [...h, move.san]);
              if (g.isGameOver()) endGame(getGameStatus(g, myColorRef.current));
            }
          } catch { /* ignore */ }
          return g;
        });
      })
      .on('broadcast', { event: 'forfeit' }, () => {
        endGame('Opponent forfeited — You win! 🏆');
      })
      .on('broadcast', { event: 'timeout' }, ({ payload }) => {
        const loser = payload.loser as Color;
        endGame(loser === 'white' ? 'Time out — Black wins! ⏰' : 'Time out — White wins! ⏰');
      })
      .subscribe();
  }, [getGameStatus]);

  const startPolling = useCallback((id: string, color: Color, tc: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const { data } = await supabase.from('rooms').select('*').eq('id', id).single();
      if (!data) return;
      setRoom(data);
      if (data.status === 'playing') {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        startGame(id, color, data.time_control ?? tc);
      }
    }, 2000);
  }, [startGame]);

  useEffect(() => {
    if (!roomId) { setPhase('create'); return; }

    async function init() {
      const playerId = getPlayerId(roomId!);
      const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single();
      if (!roomData) { setPhase('create'); return; }
      setRoom(roomData);
      const tc = roomData.time_control ?? 5;

      if (roomData.white_player === playerId) {
        if (roomData.status === 'playing') startGame(roomId!, 'white', tc);
        else { setMyColor('white'); setPhase('waiting'); startPolling(roomId!, 'white', tc); }
        return;
      }
      if (roomData.black_player === playerId) {
        if (roomData.status === 'playing') startGame(roomId!, 'black', tc);
        else { setMyColor('black'); setPhase('waiting'); startPolling(roomId!, 'black', tc); }
        return;
      }
      if (roomData.status === 'waiting') {
        const availableColor: Color = !roomData.white_player ? 'white' : 'black';
        setMyColor(availableColor);
        setTimeControl(tc);
        setPhase('join');
      } else {
        setPhase('full');
      }
    }

    init();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      channelRef.current?.unsubscribe();
    };
  }, [roomId, startGame, startPolling]);

  async function createRoom() {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const playerId = getPlayerId(code);
    const row: Partial<Room> = { id: code, status: 'waiting', time_control: timeControl };
    if (pickedColor === 'white') row.white_player = playerId;
    else row.black_player = playerId;
    await supabase.from('rooms').insert(row);
    router.push(`/play?room=${code}`);
  }

  async function joinRoom() {
    if (!roomId || !room) return;
    const playerId = getPlayerId(roomId);
    const update: Partial<Room> = { status: 'playing' };
    if (myColor === 'white') update.white_player = playerId;
    else update.black_player = playerId;
    await supabase.from('rooms').update(update).eq('id', roomId);
    startGame(roomId, myColor, room.time_control ?? timeControl);
  }

  function sendMove(from: string, to: string) {
    channelRef.current?.send({ type: 'broadcast', event: 'move', payload: { from, to, promotion: 'q' } });
  }

  function isMyTurn(g: Chess) {
    return (g.turn() === 'w' && myColor === 'white') || (g.turn() === 'b' && myColor === 'black');
  }

  function highlightMoves(square: string) {
    const moves = game.moves({ square: square as Square, verbose: true });
    if (!moves.length) { setLegalMoves({}); return; }
    const h: Record<string, React.CSSProperties> = {
      [square]: { backgroundColor: 'rgba(34,197,94,0.5)' },
    };
    moves.forEach(m => { h[m.to] = { backgroundColor: 'rgba(34,197,94,0.3)', borderRadius: '50%' }; });
    setLegalMoves(h);
  }

  function onPieceDrag({ square }: DragArgs) {
    if (!square) return;
    const piece = game.get(square as Square);
    const myPieceColor = myColor === 'white' ? 'w' : 'b';
    if (piece?.color === myPieceColor) highlightMoves(square);
  }

  function applyLocalMove(from: string, to: string): boolean {
    if (!isMyTurn(game) || gameOver) return false;
    const g = new Chess(game.fen());
    try {
      const move = g.move({ from: from as Square, to: to as Square, promotion: 'q' });
      if (!move) return false;
      sendMove(from, to);
      setGame(g);
      setMoveHistory(h => [...h, move.san]);
      setSelectedSquare(null); setLegalMoves({});
      if (g.isGameOver()) endGame(getGameStatus(g, myColor));
      return true;
    } catch { return false; }
  }

  function onSquareClick({ square }: ClickArgs) {
    if (!isMyTurn(game) || gameOver) return;
    if (selectedSquare && selectedSquare !== square) {
      if (applyLocalMove(selectedSquare, square)) return;
    }
    const piece = game.get(square as Square);
    const myPieceColor = myColor === 'white' ? 'w' : 'b';
    if (piece?.color === myPieceColor) {
      setSelectedSquare(square);
      highlightMoves(square);
    } else { setSelectedSquare(null); setLegalMoves({}); }
  }

  function onDrop({ sourceSquare, targetSquare }: DropArgs) {
    setLegalMoves({});
    if (!targetSquare) return false;
    return applyLocalMove(sourceSquare, targetSquare);
  }

  function forfeit() {
    channelRef.current?.send({ type: 'broadcast', event: 'forfeit', payload: {} });
    endGame('You forfeited 🏳️');
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/play?room=${roomId}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/play?room=${roomId}` : '';

  // ── SCREENS ──────────────────────────────────────────────────────────────────

  if (phase === 'loading') return <Screen><p className="text-gray-400 animate-pulse text-lg">Loading...</p></Screen>;

  if (phase === 'create') return (
    <Screen>
      <div className="bg-gray-800 rounded-2xl p-10 w-full max-w-md text-center">
        <div className="text-5xl mb-4">🌐</div>
        <h1 className="text-3xl font-bold text-white mb-2">Create Room</h1>
        <p className="text-gray-400 mb-6">Pick your color and time control</p>

        <p className="text-gray-400 text-sm mb-2">I want to play as:</p>
        <div className="flex gap-3 mb-6">
          {(['white', 'black'] as Color[]).map(c => (
            <button key={c} onClick={() => setPickedColor(c)}
              className={`flex-1 py-4 rounded-xl font-bold text-lg border-2 transition-all ${pickedColor === c ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-400'}`}>
              {c === 'white' ? '♔ White' : '♚ Black'}
            </button>
          ))}
        </div>

        <p className="text-gray-400 text-sm mb-2">Time control:</p>
        <div className="grid grid-cols-4 gap-2 mb-8">
          {TIME_OPTIONS.map(t => (
            <button key={t.label} onClick={() => setTimeControl(t.value)}
              className={`py-3 rounded-xl font-semibold text-sm transition-colors ${timeControl === t.value ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <button onClick={createRoom} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-lg transition-colors">
          Create Room & Get Link
        </button>
        <Link href="/game" className="block mt-4 text-gray-500 hover:text-gray-300 text-sm">← Back</Link>
      </div>
    </Screen>
  );

  if (phase === 'waiting') return (
    <Screen>
      <div className="bg-gray-800 rounded-2xl p-10 w-full max-w-md text-center">
        <div className="text-5xl mb-4 animate-pulse">⏳</div>
        <h1 className="text-2xl font-bold text-white mb-1">Waiting for opponent</h1>
        <p className="text-gray-400 mb-1">You are <span className="text-white font-bold">{myColor === 'white' ? '♔ White' : '♚ Black'}</span></p>
        <p className="text-gray-500 text-sm mb-6">Time: {timeControl === 0 ? 'Unlimited' : `${timeControl} min`}</p>
        <div className="flex gap-2 mb-4">
          <input readOnly value={shareUrl} className="flex-1 bg-gray-700 text-white text-sm px-3 py-3 rounded-xl outline-none" />
          <button onClick={copyLink} className={`px-5 py-3 rounded-xl font-semibold text-sm transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
            {copied ? '✓' : 'Copy'}
          </button>
        </div>
        <div className="bg-gray-700 rounded-xl p-3 mb-4">
          <p className="text-gray-400 text-xs mb-1">Room code</p>
          <p className="text-white font-mono font-bold text-xl tracking-widest">{roomId}</p>
        </div>
        <p className="text-gray-600 text-xs">Page updates automatically when friend joins</p>
        <Link href="/game" className="block mt-4 text-gray-500 hover:text-gray-300 text-sm">← Cancel</Link>
      </div>
    </Screen>
  );

  if (phase === 'join') {
    const opponentColor: Color = myColor === 'white' ? 'black' : 'white';
    return (
      <Screen>
        <div className="bg-gray-800 rounded-2xl p-10 w-full max-w-md text-center">
          <div className="text-5xl mb-4">🤝</div>
          <h1 className="text-2xl font-bold text-white mb-1">You're invited!</h1>
          <p className="text-gray-400 mb-1">Room <span className="text-white font-mono font-bold">{roomId}</span></p>
          <p className="text-gray-500 text-sm mb-6">Time: {timeControl === 0 ? 'Unlimited' : `${timeControl} min`}</p>
          <div className="flex gap-3 mb-8">
            <div className="flex-1 bg-gray-700 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">Opponent</p>
              <p className="text-white font-bold text-xl">{opponentColor === 'white' ? '♔ White' : '♚ Black'}</p>
            </div>
            <div className="flex-1 bg-indigo-600 rounded-xl p-4">
              <p className="text-indigo-200 text-xs mb-1">You</p>
              <p className="text-white font-bold text-xl">{myColor === 'white' ? '♔ White' : '♚ Black'}</p>
            </div>
          </div>
          <button onClick={joinRoom} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-lg transition-colors">
            Join as {myColor === 'white' ? '♔ White' : '♚ Black'}
          </button>
        </div>
      </Screen>
    );
  }

  if (phase === 'full') return (
    <Screen>
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">🚫</div>
        <h1 className="text-xl font-bold text-white mb-4">Room is full</h1>
        <Link href="/play" className="block py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">Create New Room</Link>
      </div>
    </Screen>
  );

  // ── GAME ─────────────────────────────────────────────────────────────────────
  const status = gameOver ? gameResult : getGameStatus(game, myColor);
  const opponentColor: Color = myColor === 'white' ? 'black' : 'white';
  const myTime = myColor === 'white' ? whiteTime : blackTime;
  const oppTime = myColor === 'white' ? blackTime : whiteTime;
  const myTimeLow = timeControl > 0 && myTime <= 30;
  const oppTimeLow = timeControl > 0 && oppTime <= 30;
  const myActive = !gameOver && isMyTurn(game);
  const oppActive = !gameOver && !isMyTurn(game);

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col items-center py-8 px-4 gap-4">
      {gameOver && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center max-w-sm w-full">
            <div className="text-5xl mb-4">🏁</div>
            <h2 className="text-2xl font-bold text-white mb-2">{gameResult}</h2>
            <p className="text-gray-400 mb-6">{moveHistory.length} moves</p>
            <Link href="/game" className="block py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">Back to Lobby</Link>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-5xl">
        <div className="flex flex-col items-center gap-3 flex-1">
          {/* Opponent bar */}
          <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2 w-full max-w-[560px]">
            <span className="text-2xl">👤</span>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">Opponent · {opponentColor === 'white' ? '♔ White' : '♚ Black'}</p>
            </div>
            {timeControl > 0 && (
              <span className={`font-mono font-bold text-lg ${oppTimeLow ? 'text-red-400 animate-pulse' : oppActive ? 'text-white' : 'text-gray-500'}`}>
                {formatTime(oppTime)}
              </span>
            )}
          </div>

          <div className="w-full max-w-[560px]">
            <Chessboard
              options={{
                position: game.fen(),
                onPieceDrop: onDrop,
                onSquareClick: onSquareClick,
                onPieceDrag: onPieceDrag,
                squareStyles: legalMoves,
                boardOrientation: myColor,
                boardStyle: { borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' },
                darkSquareStyle: { backgroundColor: '#4a5568' },
                lightSquareStyle: { backgroundColor: '#e2e8f0' },
                allowDragging: !gameOver && isMyTurn(game),
              }}
            />
          </div>

          {/* My bar */}
          <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2 w-full max-w-[560px]">
            <span className="text-2xl">👤</span>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">You · {myColor === 'white' ? '♔ White' : '♚ Black'}</p>
              {myActive && <p className="text-green-400 text-xs">Your turn</p>}
            </div>
            {timeControl > 0 && (
              <span className={`font-mono font-bold text-lg ${myTimeLow ? 'text-red-400 animate-pulse' : myActive ? 'text-white' : 'text-gray-500'}`}>
                {formatTime(myTime)}
              </span>
            )}
          </div>

          {!gameOver && (
            <button onClick={forfeit} className="px-5 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors">
              🏳 Forfeit
            </button>
          )}
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
            <button onClick={copyLink} className="mt-1 text-indigo-400 hover:text-indigo-300 text-xs underline">
              {copied ? 'Copied!' : 'Copy invite link'}
            </button>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 flex-1">
            <h3 className="text-gray-400 text-xs font-semibold mb-3 uppercase tracking-wider">Moves</h3>
            {moveHistory.length === 0 ? <p className="text-gray-600 text-sm">No moves yet</p> : (
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
          <Link href="/game" className="text-center text-gray-500 hover:text-gray-300 text-sm">← Back to lobby</Link>
        </div>
      </div>
    </main>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-gray-900 flex items-center justify-center px-4">{children}</main>;
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="text-white text-center py-20">Loading...</div>}>
      <MultiplayerGame />
    </Suspense>
  );
}
