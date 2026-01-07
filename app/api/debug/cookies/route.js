import { NextResponse } from 'next/server';
import { parseCookies } from '../../../../lib/auth.js';

export async function GET(req) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Production mode engaged. Safety rails are up 🛑' }, { status: 404 });
  }

  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = parseCookies(cookieHeader);
    return NextResponse.json({ cookieHeader: cookieHeader || null, cookies }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
