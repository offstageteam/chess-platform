'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import AuthModal from '@/components/AuthModal';

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null));
  }, []);

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-4 py-24 flex-1">
        <div className="text-8xl mb-6">♟</div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-4 leading-tight">
          Chess,<br />
          <span className="text-indigo-400">reimagined.</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-md mb-10">
          Play against AI, challenge friends online, and get coached after every game.
        </p>

        <div className="flex gap-4 flex-wrap justify-center">
          {user ? (
            <Link href="/game"
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-lg transition-colors shadow-lg">
              Play Now
            </Link>
          ) : (
            <>
              <button onClick={() => setShowAuth(true)}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-lg transition-colors shadow-lg">
                Get Started
              </button>
              <Link href="/game"
                className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-2xl text-lg transition-colors">
                Play as Guest
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6 pb-16 max-w-5xl mx-auto w-full">
        {[
          { icon: '🤖', title: 'AI Opponent', desc: 'Stockfish 18 — from Easy to Master level' },
          { icon: '🌐', title: 'Multiplayer', desc: 'Play with friends via shareable room link' },
          { icon: '🧠', title: 'AI Coach', desc: 'Post-game analysis of your mistakes' },
          { icon: '🏆', title: 'Leaderboard', desc: 'Compete globally, filtered by your city' },
        ].map(f => (
          <div key={f.title} className="bg-gray-800 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">{f.icon}</div>
            <h3 className="text-white font-bold mb-1">{f.title}</h3>
            <p className="text-gray-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="px-6 pb-20 max-w-3xl mx-auto w-full text-center">
        <h2 className="text-2xl font-bold text-white mb-8">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'Sign up', desc: 'Create your account in 10 seconds' },
            { step: '2', title: 'Choose mode', desc: 'Play vs AI or invite a friend online' },
            { step: '3', title: 'Improve', desc: 'Review your game with the AI Coach' },
          ].map(s => (
            <div key={s.step} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                {s.step}
              </div>
              <h3 className="text-white font-semibold">{s.title}</h3>
              <p className="text-gray-400 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  );
}
