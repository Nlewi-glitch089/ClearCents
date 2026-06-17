import prisma from '../../../lib/prisma.js';
import { parseCookies, verifyToken } from '../../../lib/auth.js';
import { NextResponse } from 'next/server';

const VALID_TYPES = ['checking', 'savings', 'cash', 'credit_card', 'investment', 'other'];

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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ accounts });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { name, type, balance } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Account name is required.' }, { status: 400 });
    }
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `Account type must be one of: ${VALID_TYPES.join(', ')}.` }, { status: 400 });
    }

    const account = await prisma.account.create({
      data: {
        userId: user.id,
        name: String(name).trim(),
        type,
        balance: balance != null ? Number(balance) : 0,
      },
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
