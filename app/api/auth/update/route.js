import prisma from '../../../../lib/prisma.js';
import { parseCookies, verifyToken } from '../../../../lib/auth.js';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = parseCookies(cookieHeader);
    const token = cookies.session;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    let payload;
    try {
      payload = verifyToken(token);
    } catch (e) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const updates = {};
    if (typeof body.name === 'string') {
      const trimmed = body.name.trim();
      if (trimmed.length > 0) updates.name = trimmed;
      else updates.name = null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: payload.id },
      data: updates,
    });

    const safe = { id: user.id, email: user.email, name: user.name || null, role: user.role };
    return NextResponse.json({ user: safe }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
