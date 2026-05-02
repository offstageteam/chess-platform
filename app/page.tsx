'use client';

import dynamic from 'next/dynamic';

const ChessGame = dynamic(() => import('@/components/ChessGame'), { ssr: false });

export default function Home() {
  return (
    <main className="flex flex-col items-center py-8 px-4">
      <ChessGame />
    </main>
  );
}
