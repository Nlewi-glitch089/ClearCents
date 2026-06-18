import prisma from '../../../../lib/prisma.js';
import { parseCookies, verifyToken } from '../../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { computeGoalProgress } from '../../../../lib/goals.js';
import { syncOnboardingGoalTitle } from '../../../../lib/ai.js';

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
    if (!user) return NextResponse.json({ error: "Nice try. The bouncer says you're not on the list 🕶️" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.goal.findUnique({ where: { id } });
    // Return 404 regardless of existence to avoid revealing other users' goal IDs
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Goal not found.' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { title, targetAmount, monthlyTarget, dueDate, status } = body;

    // startingBalance is intentionally excluded — it is immutable after creation.
    // Resetting it would invalidate all historical progress calculations.
    const updateData = {};
    if (title !== undefined) updateData.title = String(title).trim();
    if (targetAmount !== undefined) updateData.targetAmount = Number(targetAmount);
    if (monthlyTarget !== undefined) {
      updateData.monthlyTarget = monthlyTarget != null && monthlyTarget !== '' ? Number(monthlyTarget) : null;
    }
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.goal.update({ where: { id }, data: updateData });

    // Keep onboarding JSON in sync when title changes so legacy fields stay consistent
    if (title !== undefined) {
      await syncOnboardingGoalTitle(user.id, updated.title);
    }

    const transactions = await prisma.transaction.findMany({ where: { userId: user.id } });
    const [enriched] = computeGoalProgress([updated], transactions);

    // Auto-complete if this PATCH brought the goal to 100%
    let justCompleted = false;
    if (enriched.progressPercent >= 100 && updated.status === 'active') {
      try {
        await prisma.goal.update({
          where: { id },
          data: { status: 'completed', completedAt: new Date() },
        });
        enriched.status = 'completed';
        enriched.completedAt = new Date();
        justCompleted = true;
      } catch (e) {
        console.error('[goals:auto-complete]', e);
      }
    }

    return NextResponse.json({ goal: { ...enriched, currentAmount: 0, justCompleted } });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
