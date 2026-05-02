'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import AuthModal from './AuthModal';
import Link from 'next/link';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.from('profiles').select('username').eq('id', session.user.id).single()
          .then(({ data }) => setUsername(data?.username ?? ''));
      }
    });
  }, []);

  return (
    <>
      <nav className="w-full bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white">♟ ChessMate</Link>

        <div className="flex items-center gap-4">
          <Link href="/play" className="text-gray-400 hover:text-white text-sm transition-colors">
            Multiplayer
          </Link>
          <Link href="/leaderboard" className="text-gray-400 hover:text-white text-sm transition-colors">
            Leaderboard
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-gray-300 text-sm">👤 {username || user.email}</span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAuth(true)}
                className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-colors"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
