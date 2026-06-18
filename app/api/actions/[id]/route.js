import prisma from '../../../../lib/prisma.js';
import { parseCookies, verifyToken } from '../../../../lib/auth.js';
import { NextResponse } from 'next/server';

const VALID_TRANSITIONS = {
  active: ['completed', 'dismissed', 'abandoned'],
};

async function getUserFromReq(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const token = cookies.session;
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    return await prisma.user.findUnique({ where: { id: payload.id } });
  } catch {
    return null;
  }
}

export async function PATCH(req, { params }) {
  const user = await getUserFromReq(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const existing = await prisma.financialAction.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: 'Action not found' }, { status: 404 });

  let body = {};
  try { body = await req.json(); } catch {}

  const { status, metadata } = body;
  if (!status) return NextResponse.json({ error: 'status is required' }, { status: 400 });

  const allowed = VALID_TRANSITIONS[existing.status] || [];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: `Cannot transition from ${existing.status} to ${status}` }, { status: 422 });
  }

  const updateData = { status };
  if (status === 'completed') updateData.completedAt = new Date();
  if (status === 'dismissed') updateData.dismissedAt = new Date();
  if (metadata !== undefined) updateData.metadata = metadata;

  const updated = await prisma.financialAction.update({
    where: { id },
    data: updateData,
  });
  return NextResponse.json({ action: updated });
}
