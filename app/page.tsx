'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import AuthModal from '@/components/AuthModal';

const FEATURES = [
  { icon: '🤖', title: 'AI Opponent', desc: 'Stockfish 18 engine — Easy to Master in seconds' },
  { icon: '🌐', title: 'Multiplayer', desc: 'Share a link, play with anyone instantly' },
  { icon: '♟', title: 'Move Analysis', desc: 'Blunders, mistakes, better moves — all free, runs in your browser' },
  { icon: '📍', title: 'City Leaderboard', desc: 'Almaty vs Astana vs Shymkent — local pride, global game' },
];

const COMPARE = [
  { feature: 'Play vs AI',              us: true,  lichess: true  },
  { feature: 'Online multiplayer',      us: true,  lichess: true  },
  { feature: 'Post-game analysis',      us: true,  lichess: true  },
  { feature: 'City leaderboard',        us: true,  lichess: false },
  { feature: 'Progress over time',      us: '🔒 Pro', lichess: false },
  { feature: 'Mistake pattern tracking',us: '🔒 Pro', lichess: false },
  { feature: 'Win rate by opening',     us: '🔒 Pro', lichess: false },
  { feature: 'Exclusive board themes',  us: '🔒 Pro', lichess: false },
];

const PRO_FEATURES = [
  'Full game breakdown — every key moment, no limit',
  'Your rating history over time',
  'Most common mistake patterns across all games',
  'Win rate by opening — know your strengths',
  'Exclusive Marble & Night board themes',
  'City leaderboard badge',
];

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null));
  }, []);

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col text-white">

      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
        <span className="text-xl font-extrabold tracking-tight">♟ ChessKZ</span>
        <div className="flex items-center gap-3">
          <Link href="/leaderboard" className="text-gray-400 hover:text-white text-sm transition-colors">Leaderboard</Link>
          {user ? (
            <Link href="/game" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors">
              Play Now
            </Link>
          ) : (
            <button onClick={() => setShowAuth(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors">
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center justify-center text-center px-4 pt-16 pb-20">
        <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-700 text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
          Built for Kazakhstani players
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold mb-4 leading-tight tracking-tight">
          Chess that knows<br />
          <span className="text-indigo-400">where you&apos;re from.</span>
        </h1>

        <p className="text-gray-400 text-lg sm:text-xl max-w-xl mb-4 leading-relaxed">
          Play, compete, and improve — with a city leaderboard that Lichess will never have.
        </p>
        <p className="text-gray-600 text-sm mb-10">
          Almaty · Astana · Shymkent · and every city in between
        </p>

        <div className="flex gap-4 flex-wrap justify-center">
          {user ? (
            <Link href="/game"
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-lg transition-colors shadow-lg shadow-indigo-900/50">
              Play Now
            </Link>
          ) : (
            <>
              <button onClick={() => setShowAuth(true)}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-lg transition-colors shadow-lg shadow-indigo-900/50">
                Get Started — Free
              </button>
              <Link href="/game"
                className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-2xl text-lg transition-colors">
                Play as Guest
              </Link>
            </>
          )}
        </div>

        {/* Social proof */}
        <p className="text-gray-600 text-xs mt-6">No credit card required · Free forever for core features</p>
      </section>

      {/* ── Features ── */}
      <section className="px-6 pb-20 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-gray-800 rounded-2xl p-6">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="text-white font-bold mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── vs Lichess comparison ── */}
      <section className="px-6 pb-20 max-w-3xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold mb-3">Why not just use Lichess?</h2>
          <p className="text-gray-400">Lichess is great. But it doesn&apos;t know you&apos;re from Almaty.</p>
        </div>

        <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
          <div className="grid grid-cols-3 text-xs font-bold uppercase tracking-wider text-gray-400 px-6 py-3 border-b border-gray-700">
            <span>Feature</span>
            <span className="text-center text-indigo-400">ChessKZ</span>
            <span className="text-center">Lichess</span>
          </div>
          {COMPARE.map(row => (
            <div key={row.feature} className="grid grid-cols-3 px-6 py-3.5 border-b border-gray-700/50 last:border-0 items-center">
              <span className="text-gray-300 text-sm">{row.feature}</span>
              <span className="text-center">
                {row.us === true ? (
                  <span className="text-green-400 font-bold">✓</span>
                ) : row.us === false ? (
                  <span className="text-gray-600">—</span>
                ) : (
                  <span className="text-yellow-400 text-xs font-semibold">{row.us}</span>
                )}
              </span>
              <span className="text-center">
                {row.lichess ? (
                  <span className="text-green-400 font-bold">✓</span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 pb-20 max-w-3xl mx-auto w-full text-center">
        <h2 className="text-3xl font-extrabold mb-10">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { step: '1', title: 'Create account', desc: 'Sign up in 10 seconds — just a username and password' },
            { step: '2', title: 'Play a game', desc: 'vs AI or invite a friend with a shareable link' },
            { step: '3', title: 'Review & improve', desc: 'Get an instant Stockfish breakdown of every mistake' },
          ].map(s => (
            <div key={s.step} className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-900/50">
                {s.step}
              </div>
              <h3 className="text-white font-semibold text-lg">{s.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pro section ── */}
      <section className="px-6 pb-24 max-w-2xl mx-auto w-full">
        <div className="bg-gradient-to-br from-indigo-950 to-gray-900 border border-indigo-700 rounded-3xl p-8 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-600/30 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full mb-4">
            ♛ PRO PLAN
          </div>
          <h2 className="text-3xl font-extrabold mb-2">Unlock your full potential</h2>
          <div className="text-4xl font-extrabold text-indigo-400 mb-1">990 KZT</div>
          <p className="text-gray-400 text-sm mb-8">per month · cancel anytime</p>

          <ul className="text-left flex flex-col gap-3 mb-8 max-w-sm mx-auto">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-3 text-sm text-gray-300">
                <span className="text-green-400 shrink-0 mt-0.5">✓</span>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => setShowAuth(true)}
            className="w-full max-w-xs py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-lg"
          >
            Get Pro — 990 KZT/month
          </button>
          <p className="text-gray-600 text-xs mt-3">Launching soon · be the first to know</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800 py-8 px-6 text-center">
        <p className="text-gray-600 text-sm">
          ♟ ChessKZ · Built for nFactorial Incubator 2025 ·{' '}
          <Link href="/leaderboard" className="hover:text-gray-400 transition-colors">Leaderboard</Link>
          {' · '}
          <Link href="/game" className="hover:text-gray-400 transition-colors">Play</Link>
        </p>
      </footer>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  );
}
