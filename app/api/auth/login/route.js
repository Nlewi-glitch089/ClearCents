import bcrypt from 'bcryptjs';
import prisma from '../../../../lib/prisma.js';
import { signToken, createAuthCookie } from '../../../../lib/auth.js';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });

    let user;
    try {
      user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, passwordHash: true, role: true } });
    } catch (e) {
      const msg = (e && e.message) ? e.message : '';
      if (msg.includes("Can't reach database") || e.name === 'PrismaClientInitializationError') {
        return NextResponse.json({ error: 'Service temporarily unavailable — cannot reach the database.' }, { status: 503 });
      }
      throw e;
    }
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const token = signToken({ id: user.id, role: user.role });
    const cookie = createAuthCookie(token);

    const safe = { id: user.id, email: user.email, role: user.role };
    return NextResponse.json({ user: safe }, { status: 200, headers: { 'Set-Cookie': cookie } });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
