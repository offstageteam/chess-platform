export interface Puzzle {
  id: number;
  fen: string;          // position to solve (side to move is the solver)
  solution: string;     // first UCI move (e.g. "d8h4")
  solutionSan: string;  // human-readable SAN (e.g. "Qh4#")
  theme: string;        // short description of the tactic
  difficulty: 'easy' | 'medium' | 'hard';
}

export const PUZZLES: Puzzle[] = [
  {
    id: 1,
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq g3 0 2',
    solution: 'd8h4',
    solutionSan: 'Qh4#',
    theme: "Fool's Mate",
    difficulty: 'easy',
  },
  {
    id: 2,
    fen: '6k1/5ppp/8/8/8/8/8/R6K w - - 0 1',
    solution: 'a1a8',
    solutionSan: 'Ra8#',
    theme: 'Back Rank Mate',
    difficulty: 'easy',
  },
  {
    id: 3,
    fen: 'q3k3/8/8/3N4/8/8/8/4K3 w - - 0 1',
    solution: 'd5c7',
    solutionSan: 'Nc7+',
    theme: 'Knight Fork',
    difficulty: 'easy',
  },
  {
    id: 4,
    fen: '5rk1/5ppp/8/8/8/8/5PPP/5RK1 w - - 0 1',
    solution: 'f1f8',
    solutionSan: 'Rxf8#',
    theme: 'Rook Back Rank',
    difficulty: 'easy',
  },
  {
    id: 5,
    fen: '6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1',
    solution: 'd1d8',
    solutionSan: 'Qd8#',
    theme: 'Queen Delivers',
    difficulty: 'medium',
  },
  {
    id: 6,
    fen: '6k1/8/6KR/8/8/8/8/7R w - - 0 1',
    solution: 'h1h8',
    solutionSan: 'R1h8#',
    theme: 'Rook Ladder',
    difficulty: 'medium',
  },
  {
    id: 7,
    fen: '8/6k1/5q2/8/8/2B5/8/7K w - - 0 1',
    solution: 'c3f6',
    solutionSan: 'Bxf6',
    theme: 'Bishop Skewer',
    difficulty: 'medium',
  },
  {
    id: 8,
    fen: 'r3k3/8/8/3N4/8/8/8/3K4 w - - 0 1',
    solution: 'd5c7',
    solutionSan: 'Nc7+',
    theme: 'Knight Fork (R+K)',
    difficulty: 'medium',
  },
  {
    id: 9,
    fen: '7k/8/6Q1/8/8/8/8/7K w - - 0 1',
    solution: 'g6g7',
    solutionSan: 'Qg7#',
    theme: 'Queen Mate',
    difficulty: 'hard',
  },
  {
    id: 10,
    fen: '1k6/ppp5/8/1N6/8/8/8/1K5R w - - 0 1',
    solution: 'h1h8',
    solutionSan: 'Rh8#',
    theme: "Anastasia's Mate",
    difficulty: 'hard',
  },
];

/** Returns today's puzzle index (cycles daily). */
export function getDailyPuzzleIndex(): number {
  const today = new Date();
  const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
  return daysSinceEpoch % PUZZLES.length;
}
