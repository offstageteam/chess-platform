import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { moves, playerColor } = await req.json();

    if (!moves?.length) {
      return NextResponse.json({ error: 'No moves provided' }, { status: 400 });
    }

    // Build PGN string
    const pgn = moves.map((m: string, i: number) =>
      i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${m}` : m
    ).join(' ');

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `You are an expert chess coach. Analyze this game where the player played as ${playerColor}.

PGN: ${pgn}
Total moves: ${moves.length}

Return ONLY valid JSON (no markdown, no explanation outside JSON):
{
  "summary": "2-3 sentence honest overall assessment of how the player performed",
  "opening": { "name": "opening name if recognizable or 'Custom Opening'", "assessment": "1-2 sentences on how the opening was handled" },
  "keyMoments": [
    {
      "moveNumber": <number>,
      "move": "<move in SAN>",
      "player": "white or black",
      "type": "brilliant | good | inaccuracy | mistake | blunder",
      "explanation": "1 sentence explaining why this move was good or bad and what would have been better"
    }
  ],
  "positives": ["one thing the player did well", "another positive if applicable"],
  "improvements": ["the most critical thing to improve with specific advice", "second improvement if applicable"],
  "lesson": "The single most important lesson from this game in one clear sentence"
}

Include 3-6 key moments. Be specific about move numbers and moves. Be encouraging but honest.`,
      }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '';

    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
    const analysis = JSON.parse(cleaned);

    return NextResponse.json(analysis);
  } catch (err) {
    console.error('Coach API error:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
