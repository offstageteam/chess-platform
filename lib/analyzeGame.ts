import { Chess, Square } from 'chess.js';

export interface AnalyzedMoment {
  moveNumber: number;
  moveSan: string;
  player: 'white' | 'black';
  type: 'blunder' | 'mistake' | 'inaccuracy';
  cpLoss: number;
  suggestedSan: string;
  fenBefore: string;
}

function parseScore(msg: string): number | null {
  const cp = msg.match(/score cp (-?\d+)/);
  if (cp) return parseInt(cp[1]);
  const mate = msg.match(/score mate (-?\d+)/);
  if (mate) return parseInt(mate[1]) > 0 ? 10000 : -10000;
  return null;
}

function uciToSan(fen: string, uci: string): string {
  const chess = new Chess(fen);
  try {
    const move = chess.move({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: (uci[4] as 'q' | 'r' | 'b' | 'n') ?? 'q',
    });
    return move?.san ?? uci;
  } catch {
    return uci;
  }
}

export function analyzeGame(
  moves: string[],
  onProgress: (pct: number) => void,
): Promise<AnalyzedMoment[]> {
  return new Promise((resolve) => {
    const worker = new Worker('/stockfish.js');
    const moments: AnalyzedMoment[] = [];

    // Build position list (max 40 half-moves = 20 full moves)
    const chess = new Chess();
    const positions: Array<{
      fen: string;
      moveSan: string;
      moveNumber: number;
      player: 'white' | 'black';
    }> = [];

    for (let i = 0; i < Math.min(moves.length, 40); i++) {
      const fen = chess.fen();
      const player = chess.turn() === 'w' ? 'white' : 'black';
      try {
        chess.move(moves[i]);
        positions.push({ fen, moveSan: moves[i], moveNumber: Math.floor(i / 2) + 1, player });
      } catch { break; }
    }

    let idx = 0;
    let phase: 'before' | 'after' = 'before';
    let beforeScore = 0;
    let beforeBestSan = '';
    let afterScore = 0;

    const evalNext = () => {
      if (idx >= positions.length) {
        worker.terminate();
        moments.sort((a, b) => b.cpLoss - a.cpLoss);
        resolve(moments);
        return;
      }
      onProgress(Math.round((idx / positions.length) * 100));
      worker.postMessage(`position fen ${positions[idx].fen}`);
      worker.postMessage('go depth 12');
    };

    worker.onmessage = (e: MessageEvent) => {
      const msg: string = typeof e.data === 'string' ? e.data : String(e.data);

      if (msg === 'readyok') { evalNext(); return; }

      if (msg.startsWith('info') && msg.includes('score')) {
        const score = parseScore(msg);
        if (score === null) return;

        if (phase === 'before') {
          beforeScore = score;
          const pv = msg.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
          if (pv) beforeBestSan = uciToSan(positions[idx].fen, pv[1]);
        } else {
          afterScore = score;
        }
      }

      if (msg.startsWith('bestmove')) {
        const pos = positions[idx];

        if (phase === 'before') {
          if (!beforeBestSan || beforeBestSan === pos.moveSan) {
            // Played best move — skip
            idx++;
            evalNext();
          } else {
            // Evaluate position after actual move
            phase = 'after';
            afterScore = 0;
            const c = new Chess(pos.fen);
            c.move(pos.moveSan);
            worker.postMessage(`position fen ${c.fen()}`);
            worker.postMessage('go depth 12');
          }
        } else {
          // cpLoss: beforeScore is from mover's POV, afterScore from opponent's POV
          // mover's net gain = -afterScore, so loss = beforeScore - (-afterScore) = beforeScore + afterScore
          const cpLoss = beforeScore + afterScore;
          if (cpLoss >= 50) {
            moments.push({
              moveNumber: pos.moveNumber,
              moveSan: pos.moveSan,
              player: pos.player,
              type: cpLoss >= 200 ? 'blunder' : cpLoss >= 100 ? 'mistake' : 'inaccuracy',
              cpLoss,
              suggestedSan: beforeBestSan,
              fenBefore: pos.fen,
            });
          }
          idx++;
          phase = 'before';
          evalNext();
        }
      }
    };

    worker.postMessage('uci');
    worker.postMessage('isready');
  });
}
