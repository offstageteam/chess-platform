'use client';

import Link from 'next/link';

export default function GameLobby() {
  return (
    <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4 py-16">
      <h1 className="text-4xl font-extrabold text-white mb-2 text-center">Choose Game Mode</h1>
      <p className="text-gray-400 mb-12 text-center">How do you want to play today?</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* vs AI */}
        <Link href="/game/ai"
          className="group bg-gray-800 hover:bg-indigo-600 border-2 border-gray-700 hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center gap-4 transition-all duration-200 cursor-pointer">
          <span className="text-6xl">🤖</span>
          <h2 className="text-2xl font-bold text-white">vs AI</h2>
          <p className="text-gray-400 group-hover:text-indigo-200 text-sm text-center transition-colors">
            Play against Stockfish 18. Choose difficulty from Easy to Master.
          </p>
          <span className="mt-2 px-5 py-2 bg-indigo-600 group-hover:bg-white group-hover:text-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors">
            Play Now
          </span>
        </Link>

        {/* Multiplayer */}
        <Link href="/play"
          className="group bg-gray-800 hover:bg-green-600 border-2 border-gray-700 hover:border-green-500 rounded-2xl p-8 flex flex-col items-center gap-4 transition-all duration-200 cursor-pointer">
          <span className="text-6xl">🌐</span>
          <h2 className="text-2xl font-bold text-white">Multiplayer</h2>
          <p className="text-gray-400 group-hover:text-green-200 text-sm text-center transition-colors">
            Create a room and invite a friend with a link. Real-time play.
          </p>
          <span className="mt-2 px-5 py-2 bg-green-600 group-hover:bg-white group-hover:text-green-700 text-white rounded-xl font-semibold text-sm transition-colors">
            Create Room
          </span>
        </Link>
      </div>

      {/* How to play */}
      <div className="mt-16 w-full max-w-2xl bg-gray-800 rounded-2xl p-6">
        <h3 className="text-white font-bold text-lg mb-4">How to play</h3>
        <ul className="flex flex-col gap-3 text-gray-300 text-sm">
          <li className="flex gap-3"><span className="text-indigo-400 font-bold">1.</span> Drag and drop pieces to make moves</li>
          <li className="flex gap-3"><span className="text-indigo-400 font-bold">2.</span> Click a piece to see its legal moves highlighted</li>
          <li className="flex gap-3"><span className="text-indigo-400 font-bold">3.</span> Pawn promotion automatically picks Queen</li>
          <li className="flex gap-3"><span className="text-indigo-400 font-bold">4.</span> In multiplayer — share the room link with your friend and wait for them to join</li>
          <li className="flex gap-3"><span className="text-indigo-400 font-bold">5.</span> After the game, hit "Analyze" to get AI coaching tips</li>
        </ul>
      </div>
    </main>
  );
}
