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
      user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, email: true, name: true, role: true, createdAt: true } });
    } catch (e) {
      if (e && (e.name === 'PrismaClientInitializationError' || (e.message || '').includes("Can't reach database"))) {
        return NextResponse.json({ error: 'The database ghosted us. Try again in a moment 👻' }, { status: 503 });
      }
      throw e;
    }
    if (!user) {
      // Dev fallback: allow tokens that include a role to be treated as a staff user
      // This supports the dev-only `/api/staff-login` route which issues session
      // tokens for local testing. Do not enable in production.
      if (process.env.NODE_ENV !== 'production' && payload && payload.role) {
        const safe = { id: payload.id || null, email: payload.email || null, name: payload.name || null, role: payload.role };
        return NextResponse.json({ user: safe }, { status: 200 });
      }
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const safe = { id: user.id, email: user.email, name: user.name || null, role: user.role, createdAt: user.createdAt || null };
    return NextResponse.json({ user: safe }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
