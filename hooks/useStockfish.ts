'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useStockfish() {
  const workerRef = useRef<Worker | null>(null);
  const callbackRef = useRef<((move: string) => void) | null>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<{ fen: string; movetime: number } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const worker = new Worker('/stockfish.js');
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const msg: string = typeof e.data === 'string' ? e.data : String(e.data);
      if (msg === 'readyok') {
        readyRef.current = true;
        if (pendingRef.current) {
          const { fen, movetime } = pendingRef.current;
          pendingRef.current = null;
          worker.postMessage(`position fen ${fen}`);
          worker.postMessage(`go movetime ${movetime}`);
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

  // movetime in milliseconds — AI will always respond within this time
  const getMove = useCallback((fen: string, movetime: number, onBestMove: (move: string) => void) => {
    callbackRef.current = onBestMove;
    const worker = workerRef.current;
    if (!worker) return;
    if (!readyRef.current) {
      pendingRef.current = { fen, movetime };
      return;
    }
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go movetime ${movetime}`);
  }, []);

  return { getMove };
}
