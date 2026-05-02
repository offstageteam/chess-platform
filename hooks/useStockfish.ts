'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useStockfish() {
  const workerRef = useRef<Worker | null>(null);
  const callbackRef = useRef<((move: string) => void) | null>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<{ fen: string; depth: number } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const worker = new Worker('/stockfish.js');
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const msg: string = typeof e.data === 'string' ? e.data : String(e.data);

      if (msg === 'readyok') {
        readyRef.current = true;
        // If a move was requested before ready, send it now
        if (pendingRef.current) {
          const { fen, depth } = pendingRef.current;
          pendingRef.current = null;
          worker.postMessage(`position fen ${fen}`);
          worker.postMessage(`go depth ${depth}`);
        }
      }

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
      pendingRef.current = null;
    };
  }, []);

  const getMove = useCallback((fen: string, depth: number, onBestMove: (move: string) => void) => {
    callbackRef.current = onBestMove;
    const worker = workerRef.current;
    if (!worker) return;

    if (!readyRef.current) {
      // Queue it — will fire once readyok arrives
      pendingRef.current = { fen, depth };
      return;
    }

    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go depth ${depth}`);
  }, []);

  return { getMove };
}
