import { NextResponse } from 'next/server';

export async function POST() {
  const secure = process.env.NODE_ENV === 'production';
  const parts = [`session=; Path=/; Max-Age=0; HttpOnly`, `SameSite=Strict`];
  if (secure) parts.push('Secure');
  const cookie = parts.join('; ');

  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Set-Cookie': cookie,
      'Content-Type': 'application/json'
    }
  });
}
