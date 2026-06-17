import prisma from '../../../../lib/prisma.js';
import { parseCookies, verifyToken } from '../../../../lib/auth.js';
import { NextResponse } from 'next/server';

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

export async function DELETE(req, { params }) {
  try {
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const tx = await prisma.transaction.findUnique({ where: { id } });
    // Return 404 regardless of existence to avoid revealing other users' transaction IDs
    if (!tx || tx.userId !== user.id) {
      return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
    }

    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx || tx.userId !== user.id) {
      return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { amount, type, categoryId, description, occurredAt, accountId } = body;

    const updateData = {};
    if (amount !== undefined) updateData.amount = Number(amount);
    if (type !== undefined) updateData.type = type;
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    if (description !== undefined) updateData.description = description || null;
    if (occurredAt !== undefined) updateData.occurredAt = new Date(occurredAt);
    if (accountId !== undefined) updateData.accountId = accountId || null;

    const updated = await prisma.transaction.update({ where: { id }, data: updateData });
    return NextResponse.json({ transaction: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
