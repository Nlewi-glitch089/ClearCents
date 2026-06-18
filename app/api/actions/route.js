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
    return await prisma.user.findUnique({ where: { id: payload.id } });
  } catch {
    return null;
  }
}

export async function GET(req) {
  try {
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const actions = await prisma.financialAction.findMany({
      where: { userId: user.id },
      orderBy: { acceptedAt: 'desc' },
    });
    return NextResponse.json({ actions });
  } catch (err) {
    console.error('[actions:GET]', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}

    const { actionId, title, priorityScore } = body;
    if (!actionId) return NextResponse.json({ error: 'actionId is required' }, { status: 400 });
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    const action = await prisma.financialAction.create({
      data: {
        userId: user.id,
        actionId,
        title,
        priorityScore: Number(priorityScore) || 0,
        status: 'active',
      },
    });
    return NextResponse.json({ action }, { status: 201 });
  } catch (err) {
    console.error('[actions:POST]', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
