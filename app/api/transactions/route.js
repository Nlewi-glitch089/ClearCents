import prisma from '../../../lib/prisma.js';
import { parseCookies, verifyToken } from '../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { isDbError, dbUnavailableResponse } from '../../../lib/db.js';

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
    if (isDbError(e)) throw e;
    return null;
  }
}

export async function POST(req) {
  try {
    let user;
    try {
      user = await getUserFromReq(req);
    } catch (e) {
      if (isDbError(e)) return dbUnavailableResponse();
      throw e;
    }
    if (!user) return NextResponse.json({ error: 'Nice try. The bouncer says you’re not on the list 🕶️' }, { status: 401 });

    const body = await req.json();
    const { amount, type, categoryId, description, occurredAt, accountId } = body;
    if (!amount || !type) return NextResponse.json({ error: 'Required fields went on vacation 🏝️' }, { status: 400 });

    const tx = await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: Number(amount),
        type,
        categoryId: categoryId || null,
        description: description || null,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        accountId: accountId || null,
      }
    });

    return NextResponse.json({ transaction: tx }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    let user;
    try {
      user = await getUserFromReq(req);
    } catch (e) {
      if (isDbError(e)) return dbUnavailableResponse();
      throw e;
    }
    if (!user) return NextResponse.json({ error: 'Nice try. The bouncer says you’re not on the list 🕶️' }, { status: 401 });

    const txs = await prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { occurredAt: 'desc' } });
    // compute totals
    const totals = txs.reduce(
      (acc, t) => {
        if (t.type === 'income') acc.income += Number(t.amount);
        else if (t.type === 'expense') acc.expenses += Number(t.amount);
        // transfer: excluded from totals
        return acc;
      },
      { income: 0, expenses: 0 }
    );

    return NextResponse.json({ transactions: txs, totals });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
