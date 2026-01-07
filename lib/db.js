import { NextResponse } from 'next/server';

export function isDbError(err) {
  if (!err) return false;
  const name = err.name || '';
  const msg = (err.message || '').toString();
  if (/PrismaClientInitializationError/.test(name)) return true;
  if (/Can't reach database server/.test(msg)) return true;
  if (/does not exist in the current database/.test(msg)) return true;
  return false;
}

export function dbUnavailableResponse() {
  return NextResponse.json({ error: 'The database ghosted us. Try again in a moment 👻' }, { status: 503 });
}
