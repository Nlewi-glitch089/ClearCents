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
    try { body = await req.json(); } catch (e) { console.error('Silent failure detected [ai-insight:parse-body]', e); body = {}; }
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

    // build category breakdown (try to resolve category names when possible)
    const byCategoryRaw = totals.byCategory || {};
    const categoryEntries = Object.entries(byCategoryRaw).map(([k, v]) => ({ key: k, amount: v }));
    // Resolve category IDs to names by querying the DB when possible
    const categoryIds = categoryEntries.map(e => e.key).filter(k => k && k !== 'uncategorized');
    let categoryNameMap = {};
    if (categoryIds.length > 0) {
      try {
        const dbCats = await prisma.category.findMany({ where: { id: { in: categoryIds } } });
        for (const c of dbCats) categoryNameMap[c.id] = c.name;
      } catch (e) {
        console.error('DB lookup failed [ai-insight:category-lookup]', e);
      }
    }
    // Also attempt to use any category objects attached to transactions
    for (const t of txs) {
      if (t.category && t.category.name) categoryNameMap[t.category.id || t.categoryId || t.category.name] = t.category.name;
    }
    const topCategories = categoryEntries.map(e => ({ name: categoryNameMap[e.key] || String(e.key), amount: e.amount })).sort((a,b)=>b.amount-a.amount).slice(0,5);
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : null;

    // Prepare a short summary to send to the model
    let summary = `Recent transactions: ${txs.length}. Income: $${income.toFixed(2)}. Expenses: $${expenses.toFixed(2)}. Balance: $${balance.toFixed(2)}.`;
    if (onboarding) {
      summary += ` Onboarding: ${JSON.stringify(onboarding)}.`;
    }

    // Prefer a server-side key; fall back to NEXT_PUBLIC_OPENAI_KEY if present
    const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_KEY;
    let insight = '';
    let suggestions = [];

    let source = 'deterministic';
    if (OPENAI_KEY) {
      // Build a concise prompt asking for a short insight + 2-3 habit suggestions.
      // Ask the model to return a JSON object with `insight` and `suggestions` fields.
      const messages = [
        { role: 'system', content: 'You are a concise assistant that provides short, actionable budgeting insights and 2-3 habit suggestions for students. Keep the tone encouraging and non-judgmental.' },
        { role: 'user', content: `User summary: ${summary} Also include these computed values: income=${income.toFixed(2)}, expenses=${expenses.toFixed(2)}, balance=${balance.toFixed(2)}, savingsRate=${savingsRate !== null ? savingsRate.toFixed(1) : 'N/A'}. Return a JSON object like {"insight":"...","suggestions":["...","..."]} only.` }
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
          const content = data.choices[0].message.content.trim();
          // Try to parse JSON from the model; if it fails, use raw text as fallback
          try {
            const parsed = JSON.parse(content);
            insight = parsed.insight || '';
            if (Array.isArray(parsed.suggestions)) suggestions = parsed.suggestions.slice(0,4);
          } catch (e) {
            console.error('LLM parse failed [ai-insight:parse-response]', e);
            // not JSON — fall back to the raw content
            insight = content;
          }
          source = 'openai';
        } else {
          insight = `You have ${txs.length} recent transactions. Total income: $${income.toFixed(2)}; total expenses: $${expenses.toFixed(2)}.`;
          source = 'deterministic';
        }
      } catch (e) {
        console.error('LLM request failed [ai-insight:llm-call]', e);
        insight = `You have ${txs.length} recent transactions. Total income: $${income.toFixed(2)}; total expenses: $${expenses.toFixed(2)}.`;
        source = 'deterministic';
      }
    } else {
      // No key available — build a more detailed deterministic insight and suggestions
      insight = `You have ${txs.length} recent transactions. Total income: $${income.toFixed(2)}; total expenses: $${expenses.toFixed(2)}. Balance: $${balance.toFixed(2)}.`;
      if (expenses > income) {
        insight += ' You are spending more than you earn — consider trimming expenses.';
        suggestions.push('Review recurring subscriptions and cancel unused ones.');
        suggestions.push('Set a small weekly spending limit and track purchases.');
      } else {
        suggestions.push('Consider moving a portion of your leftover to a savings bucket each pay period.');
        suggestions.push('Set a short-term goal and automatically deposit a fixed amount into savings.');
      }
      source = 'deterministic';
    }

    const details = { income, expenses, balance, savingsRate: savingsRate === null ? null : Number(savingsRate.toFixed(1)), topCategories, suggestions };

    if (user) {
      const inputSnapshot = { count: txs.length, onboarding: onboarding || null };
      const inputToSave = typeof inputSnapshot === 'object' ? JSON.stringify(inputSnapshot) : inputSnapshot;
      await prisma.aiInsight.create({ data: { userId: user.id, input: inputToSave, output: insight } });
      return NextResponse.json({ insight, details, saved: true, source: source || 'unknown' });
    } else {
      return NextResponse.json({ insight, details, saved: false, message: 'Sign in to save insights and history.', source: source || 'deterministic' });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
