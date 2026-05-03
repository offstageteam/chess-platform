'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import AuthModal from './AuthModal';
import Link from 'next/link';
import { useLang } from '@/context/LangContext';
import type { Lang } from '@/lib/i18n';

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'ru', label: 'РУ' },
  { value: 'kz', label: 'ҚЗ' },
];

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [username, setUsername] = useState('');
  const { lang, setLang, t } = useLang();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.from('profiles').select('username').eq('id', session.user.id).single()
          .then(({ data }) => setUsername(data?.username ?? ''));
      } else {
        setUsername('');
      }
    });
  }, []);

  return (
    <>
      <nav className="w-full bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center justify-between" style={{ borderBottomColor: 'rgba(201,150,42,0.15)' }}>
        <Link href="/" className="text-xl font-bold text-white">♟ {t('brand')}</Link>

        <div className="flex items-center gap-4">
          <Link href="/game" className="text-gray-400 hover:text-white text-sm transition-colors">
            {t('play')}
          </Link>
          <Link href="/puzzles" className="text-gray-400 hover:text-white text-sm transition-colors">
            {t('puzzles')}
          </Link>
          <Link href="/analysis" className="text-gray-400 hover:text-white text-sm transition-colors hidden sm:inline">
            {t('analysis')}
          </Link>
          <Link href="/leaderboard" className="text-gray-400 hover:text-white text-sm transition-colors hidden sm:inline">
            {t('leaderboard')}
          </Link>

          {/* Language toggle */}
          <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg px-1 py-1 border border-gray-700">
            {LANG_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setLang(value)}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                  lang === value
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/archive" className="text-gray-300 text-sm hidden sm:block hover:text-white transition-colors">
                👤 {username || user.email}
              </Link>
              <button onClick={() => supabase.auth.signOut()}
                className="text-sm text-gray-400 hover:text-white transition-colors">
                {t('signOut')}
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)}
              className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors">
              {t('signIn')}
            </button>
          )}
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
