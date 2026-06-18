import prisma from '../../../lib/prisma.js';
import { parseCookies, verifyToken } from '../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { computeGoalProgress, parseTargetAmount } from '../../../lib/goals.js';
import { getOnboardingData } from '../../../lib/ai.js';

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

export async function GET(req) {
  try {
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'Nice try. The bouncer says you’re not on the list 🕶️' }, { status: 401 });

    let [goals, transactions] = await Promise.all([
      prisma.goal.findMany({
        where: { userId: user.id, status: 'active' },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.transaction.findMany({ where: { userId: user.id } }),
    ]);

    // Lazy backfill: if no active Goal record exists, attempt to seed one from
    // onboarding data. startingBalance is set to 0 because the original balance
    // at onboarding time is not recoverable for historical users — see lib/goals.js
    // computeGoalProgress for the full migration tradeoff explanation.
    if (goals.length === 0) {
      const onboarding = await getOnboardingData(user.id).catch(() => null);
      if (onboarding && (onboarding.goalType || onboarding.goal || onboarding.monthly)) {
        const title = onboarding.goalType || onboarding.goal || 'My savings goal';
        // Prefer explicit targetAmount (set by wizard in Sprint 20B), fall back to text parsing
        const backfillAmount = (onboarding.targetAmount && Number(onboarding.targetAmount) > 0)
          ? Number(onboarding.targetAmount)
          : parseTargetAmount(onboarding.goal || '');
        if (backfillAmount > 0) {
          try {
            const backfilled = await prisma.goal.create({
              data: {
                userId: user.id,
                title,
                targetAmount: backfillAmount,
                monthlyTarget: onboarding.monthly ? Number(onboarding.monthly) : null,
                startingBalance: 0,
                dueDate: null,
                status: 'active',
              },
            });
            goals = [backfilled];
          } catch (backfillErr) {
            console.error('Silent failure detected [goals:backfill]', backfillErr);
          }
        }
      }
    }

    const enriched = computeGoalProgress(goals, transactions);

    // Auto-complete any goal that has reached 100% — marks it in the DB and
    // returns it in this response with justCompleted:true so the dashboard can
    // show the celebration without a second round-trip.
    const justCompletedIds = new Set();
    for (const g of enriched) {
      if (g.progressPercent >= 100 && g.status === 'active') {
        try {
          await prisma.goal.update({
            where: { id: g.id },
            data: { status: 'completed', completedAt: new Date() },
          });
          g.status = 'completed';
          g.completedAt = new Date();
          justCompletedIds.add(g.id);
        } catch (e) {
          console.error('[goals:auto-complete]', e);
        }
      }
    }

    // currentAmount: 0 retained for API compatibility while older frontend code is
    // still being migrated. New code reads currentSaved. Remove in a future cleanup sprint.
    const out = enriched.map(g => ({ ...g, currentAmount: 0, justCompleted: justCompletedIds.has(g.id) }));

    return NextResponse.json({ goals: out });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'Nice try. The bouncer says you’re not on the list 🕶️' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { title, targetAmount, monthlyTarget, dueDate } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: 'A goal needs a title.' }, { status: 400 });
    }
    if (!targetAmount || Number(targetAmount) <= 0) {
      return NextResponse.json({ error: 'A goal needs a target amount greater than zero.' }, { status: 400 });
    }

    const existingActive = await prisma.goal.findFirst({
      where: { userId: user.id, status: 'active' },
    });
    if (existingActive) {
      return NextResponse.json(
        { error: 'You already have an active goal. Archive or complete it before creating a new one.' },
        { status: 409 }
      );
    }

    // Capture current balance as startingBalance so delta-based progress is accurate
    const transactions = await prisma.transaction.findMany({ where: { userId: user.id } });
    let income = 0, exp = 0;
    for (const t of transactions) {
      if (t.type === 'income') income += Number(t.amount);
      else if (t.type === 'expense') exp += Number(t.amount);
      // transfer: excluded from starting balance calculation
    }
    const startingBalance = income - exp;

    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: String(title).trim(),
        targetAmount: Number(targetAmount),
        monthlyTarget: monthlyTarget != null && monthlyTarget !== '' ? Number(monthlyTarget) : null,
        startingBalance,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'active',
      },
    });

    const [enriched] = computeGoalProgress([goal], transactions);
    return NextResponse.json({ goal: { ...enriched, currentAmount: 0 } }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
