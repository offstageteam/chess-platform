'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  username: string;
  city: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Profile[]>([]);
  const [cityFilter, setCityFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      let query = supabase.from('profiles').select('*').order('rating', { ascending: false }).limit(50);
      if (cityFilter) query = query.ilike('city', `%${cityFilter}%`);
      const { data } = await query;
      setPlayers(data ?? []);
      setLoading(false);
    }
    load();
  }, [cityFilter]);

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-white mb-2">🏆 Leaderboard</h1>
      <p className="text-gray-400 mb-6">Top players ranked by rating</p>

      {/* City quick-select */}
      <div className="flex flex-wrap gap-2 mb-3">
        {['', 'Almaty', 'Astana', 'Shymkent'].map(city => (
          <button
            key={city}
            onClick={() => setCityFilter(city)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              cityFilter === city
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {city === '' ? '🌍 Global' : `📍 ${city}`}
          </button>
        ))}
      </div>

      <input
        placeholder="Or type any city…"
        value={cityFilter}
        onChange={e => setCityFilter(e.target.value)}
        className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 mb-6 outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : players.length === 0 ? (
        <p className="text-gray-500">No players yet. Be the first!</p>
      ) : (
        <div className="flex flex-col gap-2">
          {players.map((p, i) => (
            <div key={p.id} className={`flex items-center gap-4 rounded-xl px-5 py-4 border ${i === 0 ? 'bg-gray-800 border-indigo-700' : 'bg-gray-800 border-gray-700'}`}>
              <span className={`text-sm font-bold w-7 tabular-nums text-right ${i === 0 ? 'text-indigo-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-gray-400' : 'text-gray-600'}`}>
                {i === 0 ? '♛' : i + 1}
              </span>
              <div className="flex-1">
                <p className="text-white font-semibold">{p.username}</p>
                {p.city && <p className="text-gray-500 text-xs">{p.city}</p>}
              </div>
              <div className="text-right">
                <p className="text-indigo-400 font-bold">{p.rating}</p>
                <p className="text-gray-500 text-xs">{p.wins}W {p.losses}L {p.draws}D</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
