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

export async function POST(req){
  try{
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    // Store the entire body as the input snapshot so we persist reasons and any other fields
    const input = body;
    const inputToSave = typeof input === 'object' ? JSON.stringify(input) : input;
    const output = `Onboarding saved: ${body.goal || 'no goal provided'}`;
    await prisma.aiInsight.create({ data: { userId: user.id, input: inputToSave, output } });
    const res = NextResponse.json({ success: true });
    // clear the must_onboard flag so middleware won't redirect again
    res.headers.append('Set-Cookie', 'must_onboard=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
    return res;
  }catch(err){
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

export async function GET(req){
  try{
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Return the most recent onboarding-like aiInsight input for this user
    const record = await prisma.aiInsight.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
    if (!record) return NextResponse.json({ onboarding: null });

    return NextResponse.json({ onboarding: record.input || null });
  }catch(err){
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
