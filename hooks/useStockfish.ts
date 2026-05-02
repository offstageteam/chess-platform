'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useStockfish() {
  const workerRef = useRef<Worker | null>(null);
  const callbackRef = useRef<((move: string) => void) | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const worker = new Worker('/stockfish.js');
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const msg: string = typeof e.data === 'string' ? e.data : '';
      if (msg === 'readyok') readyRef.current = true;
      if (msg.startsWith('bestmove')) {
        const move = msg.split(' ')[1];
        if (move && move !== '(none)') {
          callbackRef.current?.(move);
          callbackRef.current = null;
        }
      }
    };

    worker.postMessage('uci');
    worker.postMessage('isready');

    return () => {
      worker.terminate();
      workerRef.current = null;
      readyRef.current = false;
    };
  }, []); // runs once only

  const getMove = useCallback((fen: string, depth: number, onBestMove: (move: string) => void) => {
    const worker = workerRef.current;
    if (!worker) return;
    callbackRef.current = onBestMove;
    worker.postMessage('stop');
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go depth ${depth}`);
  }, []);

  return { getMove };
}
