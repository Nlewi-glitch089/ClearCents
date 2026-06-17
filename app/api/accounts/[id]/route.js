import prisma from '../../../../lib/prisma.js';
import { parseCookies, verifyToken } from '../../../../lib/auth.js';
import { NextResponse } from 'next/server';

const VALID_TYPES = ['checking', 'savings', 'cash', 'credit_card', 'investment', 'other'];

async function getUserFromReq(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const token = cookies.session;
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    return user;
  } catch (e) {
    return null;
  }
}

export async function PATCH(req, { params }) {
  try {
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, type, balance } = body;

    const updateData = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (type !== undefined) {
      if (!VALID_TYPES.includes(type)) {
        return NextResponse.json({ error: `Account type must be one of: ${VALID_TYPES.join(', ')}.` }, { status: 400 });
      }
      updateData.type = type;
    }
    if (balance !== undefined) updateData.balance = Number(balance);

    const account = await prisma.account.update({ where: { id }, data: updateData });
    return NextResponse.json({ account });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    // Transactions referencing this account keep their accountId set to null (ON DELETE SET NULL).
    await prisma.account.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
