import bcrypt from 'bcryptjs';
import prisma from '../../../../lib/prisma.js';
import { signToken, createAuthCookie } from '../../../../lib/auth.js';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { email, password, role = 'member' } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Missing email or password — required fields went on vacation 🏝️' }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: 'This user already exists. Doppelgängers detected 👯' }, { status: 409 });

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, passwordHash: hash, role } });

    // do not return password hash
    const token = signToken({ id: user.id, role: user.role });
    const cookie = createAuthCookie(token);
    const safe = { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt };

    // Set the session cookie and a short-lived must_onboard flag so middleware
    // will only force onboarding immediately after registration.
    const headers = new Headers();
    headers.append('Set-Cookie', cookie);
    headers.append('Set-Cookie', 'must_onboard=1; Path=/; HttpOnly; SameSite=Lax');

    return NextResponse.json({ user: safe }, { status: 201, headers });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
