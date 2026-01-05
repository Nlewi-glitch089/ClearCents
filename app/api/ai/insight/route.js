import prisma from '../../../../lib/prisma.js';
import { parseCookies, verifyToken } from '../../../../lib/auth.js';
import { NextResponse } from 'next/server';

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
    // parse optional body (may include transactions for guests or onboarding for signed-in users)
    let body = {};
    try { body = await req.json(); } catch (e) { body = {}; }
    // Allow unauthenticated users to request an insight by sending transactions in the POST body.
    // If the user is signed in, prefer using persisted transactions for richer context.
    let txs = [];
    if (user) {
      txs = await prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { occurredAt: 'desc' }, take: 50 });
    } else {
      // try to parse transactions passed from the client for guest insight
      if (Array.isArray(body.transactions) && body.transactions.length > 0) txs = body.transactions.slice(0, 50);
    }

    const onboarding = body.onboarding || null;

    if (txs.length === 0 && !onboarding) {
      return NextResponse.json({ insight: 'Start adding your income and expenses to receive personalized insights!' });
    }

    // Compute totals by category and type
    const totals = txs.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + Number(t.amount);
      acc.byCategory = acc.byCategory || {};
      const cat = t.categoryId || 'uncategorized';
      acc.byCategory[cat] = (acc.byCategory[cat] || 0) + Number(t.amount);
      return acc;
    }, {});

    const income = totals.income || 0;
    const expenses = totals.expense || 0;
    const balance = income - expenses;

    // Prepare a short summary to send to the model
    let summary = `Recent transactions: ${txs.length}. Income: $${income.toFixed(2)}. Expenses: $${expenses.toFixed(2)}. Balance: $${balance.toFixed(2)}.`;
    if (onboarding) {
      summary += ` Onboarding: ${JSON.stringify(onboarding)}.`;
    }

    // Prefer a server-side key; fall back to NEXT_PUBLIC_OPENAI_KEY if present
    const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_KEY;
    let insight = '';

    let source = 'deterministic';
    if (OPENAI_KEY) {
      // Build a concise prompt asking for a short insight + 2 habit suggestions
      const messages = [
        { role: 'system', content: 'You are a concise assistant that provides short, actionable budgeting insights and 2-3 habit suggestions for students. Keep the tone encouraging and non-judgmental.' },
        { role: 'user', content: `User summary: ${summary} Provide a one-sentence insight and then 2 short habit suggestions (bullet points).` }
      ];

      try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_KEY}`,
          },
          body: JSON.stringify({ model: 'gpt-3.5-turbo', messages, max_tokens: 250, temperature: 0.6 }),
        });

        const data = await resp.json();
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
          insight = data.choices[0].message.content.trim();
          source = 'openai';
        } else {
          insight = `You have ${txs.length} recent transactions. Total income: $${income.toFixed(2)}; total expenses: $${expenses.toFixed(2)}.`;
          source = 'deterministic';
        }
      } catch (e) {
        insight = `You have ${txs.length} recent transactions. Total income: $${income.toFixed(2)}; total expenses: $${expenses.toFixed(2)}.`;
        source = 'deterministic';
      }
    } else {
      // No key available — fall back to a simple deterministic insight
      insight = `You have ${txs.length} recent transactions. Total income: $${income.toFixed(2)}; total expenses: $${expenses.toFixed(2)}. Balance: $${balance.toFixed(2)}.`;
      if (expenses > income) insight += ' You are spending more than you earn — consider trimming expenses.';
      source = 'deterministic';
    }

    // Save AI insight only when a user is authenticated; for guests, return insight but mark as unsaved
    if (user) {
      await prisma.aiInsight.create({ data: { userId: user.id, input: { count: txs.length, onboarding: onboarding || null }, output: insight } });
      return NextResponse.json({ insight, saved: true, source: source || 'unknown' });
    } else {
      return NextResponse.json({ insight, saved: false, message: 'Sign in to save insights and history.', source: source || 'deterministic' });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
