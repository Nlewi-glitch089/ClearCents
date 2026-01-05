import prisma from '../../../../lib/prisma.js';
import { parseCookies, verifyToken } from '../../../../lib/auth.js';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = parseCookies(cookieHeader);
    const token = cookies.session;
    if (!token) return NextResponse.json({ user: null }, { status: 200 });

    let payload;
    try {
      payload = verifyToken(token);
    } catch (e) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    let user;
    try {
      user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, email: true, role: true } });
    } catch (e) {
      if (e && (e.name === 'PrismaClientInitializationError' || (e.message || '').includes("Can't reach database"))) {
        return NextResponse.json({ error: 'Service temporarily unavailable — cannot reach the database.' }, { status: 503 });
      }
      throw e;
    }
    if (!user) return NextResponse.json({ user: null }, { status: 200 });

    const safe = { id: user.id, email: user.email, name: null, role: user.role };
    return NextResponse.json({ user: safe }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
