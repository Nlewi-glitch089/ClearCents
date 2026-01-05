import prisma from '../../../../lib/prisma.js';
import { parseCookies, verifyToken } from '../../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { getRecentTransactionsForUser, summarizeTransactions, getRecentInsights, getEmbedding, cosine, buildPrompt } from '../../../../lib/ai.js';

async function getUserFromReq(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const token = cookies.session;
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    return user;
  } catch (e) {
    return null;
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromReq(req);
    const body = await req.json().catch(() => ({}));
    const query = (body.query || '').trim();
    if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    if (query.length > 2000) return NextResponse.json({ error: 'Query too long' }, { status: 400 });

    let txs = [];
    if (user) {
      txs = await getRecentTransactionsForUser(user.id, 100);
    } else if (Array.isArray(body.transactions)) {
      txs = body.transactions.slice(0, 100);
    }

    const insights = user ? await getRecentInsights(user.id, 6) : [];

    const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_KEY;

    // Build candidate context texts
    const contexts = [];
    if (txs && txs.length > 0) contexts.push(summarizeTransactions(txs, 8));
    for (const i of insights) {
      if (i && i.output) contexts.push(`Past insight: ${i.output}`);
      if (i && i.input) contexts.push(`Past input: ${JSON.stringify(i.input)}`);
    }

    // Use embeddings to rank contexts if key available
    let selectedContexts = contexts.slice(0, 3);
    if (OPENAI_KEY && contexts.length > 0) {
      try {
        const qEmb = await getEmbedding(query, OPENAI_KEY);
        const ctxEmbs = await Promise.all(contexts.map(c => getEmbedding(c, OPENAI_KEY)));
        const scored = [];
        for (let i = 0; i < contexts.length; i++) {
          const emb = ctxEmbs[i];
          if (!emb || !qEmb) continue;
          scored.push({ idx: i, score: cosine(qEmb, emb) });
        }
        scored.sort((a, b) => b.score - a.score);
        selectedContexts = scored.slice(0, 3).map(s => contexts[s.idx]);
      } catch (e) {
        selectedContexts = contexts.slice(0, 3);
      }
    }

    // Build prompt
    const prompt = buildPrompt(query, selectedContexts);

    let answer = '';
    let source = 'deterministic';

    if (OPENAI_KEY) {
      const messages = [
        { role: 'system', content: 'You are a concise, non-judgmental financial assistant for students. Answer clearly and cite any transaction context provided.' },
        { role: 'user', content: prompt }
      ];
      try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
          body: JSON.stringify({ model: 'gpt-3.5-turbo', messages, max_tokens: 450, temperature: 0.2 })
        });
        const data = await resp.json();
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
          answer = data.choices[0].message.content.trim();
          source = 'openai';
        } else {
          answer = 'I could not generate an answer right now.';
        }
      } catch (e) {
        answer = 'Error contacting LLM provider.';
      }
    } else {
      // Fallback deterministic responder
      answer = `I see ${txs.length} recent transactions. Ask specific questions like "How much did I spend on food last month?" or "How can I reduce expenses?"`;
      source = 'deterministic';
    }

    // Persist the query/answer for authenticated users
    if (user) {
      const inputSnapshot = { query, context: selectedContexts };
      const inputToSave = typeof inputSnapshot === 'object' ? JSON.stringify(inputSnapshot) : inputSnapshot;
      await prisma.aiInsight.create({ data: { userId: user.id, input: inputToSave, output: answer } });
      return NextResponse.json({ answer, saved: true, source });
    }

    return NextResponse.json({ answer, saved: false, source });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
