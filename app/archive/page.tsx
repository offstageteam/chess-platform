'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/context/LangContext';
import Link from 'next/link';

interface GameRow {
  id: string;
  winner: 'white' | 'black' | 'draw' | null;
  moves: string[];
  pgn: string;
  mode: string;
  created_at: string;
  white_id: string | null;
}

export default function ArchivePage() {
  const { t } = useLang();
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) { setLoading(false); return; }
      supabase
        .from('games')
        .select('*')
        .or(`white_id.eq.${uid},black_id.eq.${uid}`)
        .order('created_at', { ascending: false })
        .limit(50)
        .then(({ data: rows }) => {
          setGames((rows as GameRow[]) ?? []);
          setLoading(false);
        });
    });
  }, []);

  function resultLabel(game: GameRow): { label: string; color: string } {
    if (!game.winner) return { label: t('drew'), color: 'text-gray-400' };
    const isWhite = game.white_id === userId;
    if (game.winner === 'draw') return { label: t('drew'), color: 'text-gray-400' };
    const playerWon = (isWhite && game.winner === 'white') || (!isWhite && game.winner === 'black');
    return playerWon
      ? { label: t('won'), color: 'text-green-400' }
      : { label: t('lost'), color: 'text-red-400' };
  }

  function modeIcon(mode: string) {
    if (mode === 'ai') return '🤖';
    if (mode === 'multiplayer') return '🌐';
    return '♟';
  }

  if (!userId && !loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-white mb-2">{t('archiveTitle')}</h1>
        <p className="text-gray-400 mb-6">Sign in to see your game history</p>
        <Link href="/" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors">
          {t('signIn')}
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">{t('archiveTitle')}</h1>
        <p className="text-gray-400">{t('archiveSub')}</p>
      </div>

      {loading ? (
        <p className="text-gray-500">{t('loading')}</p>
      ) : games.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">♟</div>
          <p className="text-gray-400">{t('noGames')}</p>
          <Link href="/game" className="mt-6 inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors">
            {t('playNow')}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {games.map(game => {
            const { label, color } = resultLabel(game);
            const date = new Date(game.created_at).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', year: 'numeric',
            });
            const isExpanded = expanded === game.id;

            return (
              <div key={game.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-750 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : game.id)}
                >
                  <span className="text-2xl">{modeIcon(game.mode)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${color}`}>{label}</span>
                      <span className="text-gray-600 text-xs">·</span>
                      <span className="text-gray-500 text-xs capitalize">{game.mode}</span>
                    </div>
                    <p className="text-gray-500 text-xs">{date}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-gray-300 text-sm tabular-nums">{game.moves.length} {t('moves')}</p>
                  </div>
                  <span className="text-gray-600 text-xs ml-1">{isExpanded ? '▲' : '▼'}</span>
                </div>

                {/* Expanded: PGN + move list */}
                {isExpanded && (
                  <div className="border-t border-gray-700 px-5 py-4">
                    {game.moves.length > 0 ? (
                      <>
                        <div className="flex flex-wrap gap-1 mb-4">
                          {game.moves.map((san, i) => {
                            const isWhiteMove = i % 2 === 0;
                            const moveNum = Math.floor(i / 2) + 1;
                            return (
                              <span key={i} className="flex items-center gap-0.5">
                                {isWhiteMove && (
                                  <span className="text-gray-600 text-xs tabular-nums mr-0.5">{moveNum}.</span>
                                )}
                                <span className="px-1.5 py-0.5 text-xs font-mono text-gray-300 bg-gray-700 rounded">
                                  {san}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                        {/* Load in Analysis Board */}
                        <Link
                          href={`/analysis?pgn=${encodeURIComponent(game.pgn)}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                          🔍 {t('analyzGame')}
                        </Link>
                      </>
                    ) : (
                      <p className="text-gray-600 text-sm">No moves recorded</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
