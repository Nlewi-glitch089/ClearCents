import prisma from '../../../lib/prisma.js';
import { parseCookies, verifyToken } from '../../../lib/auth.js';
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

export async function GET(req) {
  try {
    const user = await getUserFromReq(req);

    // If not signed in, return a small set of default categories (not persisted)
    // Keep a single "Other" option to avoid duplicate buttons in the UI.
    const incomeDefaults = ['Job','Allowance','Gift','Side Hustle'];
    const expenseDefaults = ['Food & Dining','Transport','Entertainment','Subscriptions','Other'];
    const defaults = [...incomeDefaults, ...expenseDefaults];
    if (!user) {
      const cats = [];
      const seen = new Set();
      incomeDefaults.forEach((name, idx) => {
        const key = name.trim().toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          cats.push({ id: `default-income-${idx}-${key.replace(/\s+/g,'')}`, name, type: 'income' });
        }
      });
      expenseDefaults.forEach((name, idx) => {
        const key = name.trim().toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          cats.push({ id: `default-expense-${idx}-${key.replace(/\s+/g,'')}`, name, type: 'expense' });
        }
      });
      return NextResponse.json({ categories: cats });
    }

    // ensure some default categories exist for the user
    const existing = await prisma.category.findMany({ where: { userId: user.id } });
    if (existing.length === 0) {
      const incomeSet = new Set(incomeDefaults.map(n => n.toLowerCase()));
      for (const name of defaults) {
        const isIncome = incomeSet.has(name.toLowerCase());
        await prisma.category.create({ data: { userId: user.id, name, type: isIncome ? 'income' : 'expense' } });
      }
    }

    const cats = await prisma.category.findMany({ where: { userId: user.id } });
    return NextResponse.json({ categories: cats });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
