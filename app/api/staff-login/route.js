import { NextResponse } from 'next/server';
import { signToken, createAuthCookie } from '../../../lib/auth.js';

// Dev-only staff credentials (insecure - for local/dev only)
const STAFF = {
  rob: 'chocolate',
  sanaa: 'hello kitty',
  taheera: 'bonchan'
};

export async function POST(req) {
  try {
    const body = await req.json();
    const name = (body.name || '').toLowerCase().trim();
    const password = body.password || '';
    if (!name || !password) return NextResponse.json({ error: 'Something’s missing… and it’s important 🧐' }, { status: 400 });

    const expected = STAFF[name];
    if (!expected || expected !== password) {
      return NextResponse.json({ error: 'Nice try. The bouncer says you’re not on the list 🕶️' }, { status: 401 });
    }

    // Issue a session token with role 'coach' (full staff access)
    const payload = { sub: name, role: 'coach', name };
    const token = signToken(payload);
    const cookie = createAuthCookie(token);

    const res = NextResponse.json({ ok: true });
    res.headers.append('Set-Cookie', cookie);
    return res;
  } catch (e) {
    return NextResponse.json({ error: 'Command failed spectacularly 💥' }, { status: 500 });
  }
}
