import bcrypt from 'bcryptjs';
import prisma from '../../../lib/prisma.js';
import { NextResponse } from 'next/server';

// Dev-only endpoint: set staff users' passwords to the provided mapping.
// WARNING: Insecure — only intended for local development. Disabled in production.
const STAFF = [
  { email: 'rob@launchpadphilly.org', password: 'chocolate' },
  { email: 'sanaa@launchpadphilly.org', password: 'hello kitty' },
  { email: 'taheera@launchpadphilly.org', password: 'bonchan' }
];

export async function POST(req) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Absolutely not. Production says no 🙅‍♀️' }, { status: 403 });
  }

  try {
    for (const u of STAFF) {
      const hash = await bcrypt.hash(u.password, 10);
      await prisma.user.updateMany({ where: { email: u.email }, data: { passwordHash: hash } });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
