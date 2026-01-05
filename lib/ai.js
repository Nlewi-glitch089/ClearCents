import prisma from './prisma.js';

function truncateText(s, n = 1000) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '...' : s;
}

export async function getRecentTransactionsForUser(userId, limit = 50) {
  return prisma.transaction.findMany({ where: { userId }, orderBy: { occurredAt: 'desc' }, take: limit });
}

export function summarizeTransactions(txs = [], maxEntries = 8) {
  const recent = txs.slice(0, maxEntries);
  const totals = recent.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + Number(t.amount);
    acc.byCategory = acc.byCategory || {};
    const cat = t.categoryId || t.description || 'uncategorized';
    acc.byCategory[cat] = (acc.byCategory[cat] || 0) + Number(t.amount);
    return acc;
  }, {});

  const income = (totals.income || 0).toFixed(2);
  const expenses = (totals.expense || 0).toFixed(2);
  const balance = (Number(income) - Number(expenses)).toFixed(2);

  const lines = recent.map(t => `${t.type === 'income' ? '+' : '-'}$${Number(t.amount).toFixed(2)} ${t.description || ''}`.trim());

  return `Summary: ${recent.length} recent transactions. Income: $${income}. Expenses: $${expenses}. Balance: $${balance}. Transactions: ${lines.join('; ')}.`;
}

export async function getRecentInsights(userId, limit = 6) {
  return prisma.aiInsight.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit });
}

export async function getEmbedding(text, OPENAI_KEY) {
  if (!OPENAI_KEY) return null;
  const body = { model: 'text-embedding-3-small', input: truncateText(text, 2000) };
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` }, body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data && data.data && data.data[0]) return data.data[0].embedding;
  return null;
}

export function cosine(a = [], b = []) {
  if (!a || !b || a.length !== b.length) return -1;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return -1;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function buildPrompt(query, contexts = []) {
  const ctx = contexts.map((c, i) => `Context ${i+1}: ${truncateText(c, 1000)}`).join('\n\n');
  return `You are a helpful, concise assistant specialized in personal finance for students. Use the provided context when answering.
\n${ctx}\n\nUser question: ${query}\n\nAnswer briefly and cite context lines when relevant.`;
}
