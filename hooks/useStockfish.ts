'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useStockfish(onBestMove: (move: string) => void) {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const worker = new Worker('/stockfish.js');
    workerRef.current = worker;

    worker.postMessage('uci');
    worker.postMessage('isready');

    worker.onmessage = (e: MessageEvent) => {
      const msg: string = typeof e.data === 'string' ? e.data : e.data?.toString() ?? '';
      if (msg.startsWith('bestmove')) {
        const parts = msg.split(' ');
        const move = parts[1];
        if (move && move !== '(none)') {
          onBestMove(move);
        }
      }
    };

    return () => worker.terminate();
  }, [onBestMove]);

  const getMove = useCallback((fen: string, depth = 12) => {
    const worker = workerRef.current;
    if (!worker) return;
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go depth ${depth}`);
  }, []);

  return { getMove };
}
