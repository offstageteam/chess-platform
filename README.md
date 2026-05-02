# ♟ ChessMate

**Play. Learn. Dominate.**

A modern chess platform built to stand out — not just another chess board.

## What it does

- **Play vs AI** — powered by Stockfish 18, adjustable difficulty (Easy → Master)
- **Local 2-player** — full rules: castling, en passant, promotion, check/checkmate/draw
- **Multiplayer** — play with a friend via shareable room link (Supabase Realtime, no account needed)
- **AI Coach** — post-game move analysis highlighting mistakes and great plays
- **Leaderboard** — global rankings filterable by city (e.g. top players in Almaty)
- **Auth** — sign up to save progress and appear on the leaderboard
- **Upgrade to Pro** — monetization-ready CTA (Stripe-ready)

## Who it's for

Chess players of all levels who want more than just a board — coaching, competition, and community in one place.

## Why it's valuable

Combines AI opponents, real-time multiplayer, move coaching, and social ranking — all in a clean, mobile-friendly UI that runs instantly in the browser. A ready prototype for a real chess SaaS.

## Tech stack

- **Next.js 16** + TypeScript + Tailwind CSS
- **chess.js** — full chess rules engine
- **react-chessboard** — drag & drop board UI
- **Stockfish 18** — world's strongest open-source chess engine (runs as Web Worker)
- **Supabase** — auth, PostgreSQL, Realtime channels for multiplayer

## Setup

```bash
npm install
```

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Run `supabase-setup.sql` in your Supabase SQL Editor, then:

```bash
npm run dev
```
