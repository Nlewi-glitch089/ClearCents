import bcrypt from 'bcryptjs';
import prisma from '../../../../lib/prisma.js';
import { parseCookies, verifyToken } from '../../../../lib/auth.js';
import { NextResponse } from 'next/server';

async function getPayloadFromReq(req){
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const token = cookies.session;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch (e) {
    return null;
  }
}

export async function POST(req){
  try{
    const payload = await getPayloadFromReq(req);
    if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json();
    const { password } = body;
    if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: 'Invalid password' }, { status: 401 });

    // Remove dependent records in a safe order to avoid FK issues
    await prisma.transaction.deleteMany({ where: { userId: user.id } });
    await prisma.aiInsight.deleteMany({ where: { userId: user.id } });
    await prisma.goal.deleteMany({ where: { userId: user.id } });
    // For categories we will delete user-owned categories; if you prefer to keep them, change to updateMany({ data: { userId: null } })
    await prisma.category.deleteMany({ where: { userId: user.id } });

    await prisma.user.delete({ where: { id: user.id } });

    const res = NextResponse.json({ success: true });
    // Clear session cookie
    res.headers.append('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0; SameSite=Strict');
    return res;
  }catch(err){
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
