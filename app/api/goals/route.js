import prisma from '../../../lib/prisma.js';
import { parseCookies, verifyToken } from '../../../lib/auth.js';
import { NextResponse } from 'next/server';

async function getUserFromReq(req){
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

export async function GET(req){
  try{
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'Nice try. The bouncer says you’re not on the list 🕶️' }, { status: 401 });

    const goals = await prisma.goal.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
    // map decimals to numbers
    const out = goals.map(g => ({ id: g.id, title: g.title, targetAmount: Number(g.targetAmount), currentAmount: Number(g.currentAmount), dueDate: g.dueDate }));
    return NextResponse.json({ goals: out });
  }catch(err){
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
