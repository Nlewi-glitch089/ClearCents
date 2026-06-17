import prisma from '../../../lib/prisma.js';
import { parseCookies, verifyToken } from '../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { parseTargetAmount, mapTimeframeToDueDate } from '../../../lib/goals.js';

async function getUserFromReq(req){
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

export async function POST(req){
  try{
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'Nice try. The bouncer says you’re not on the list 🕶️' }, { status: 401 });
    const body = await req.json();
    // Store the entire body as a JSON input snapshot so we persist reasons and any other fields
    const input = { ...body, type: 'onboarding' };
    const output = `Onboarding saved: ${body.goal || 'no goal provided'}`;
    // write JSON directly so Prisma stores a proper JSON object
    await prisma.aiInsight.create({ data: { userId: user.id, input: input, output } });

    // Upsert the canonical Goal record from onboarding data.
    // Wrapped in try/catch so a goal-write failure never blocks the onboarding response.
    // Uses prisma.$transaction for atomic find-then-create/update to guard against
    // concurrent submissions creating duplicate active goals (application-level protection;
    // a partial unique index on goals(user_id) WHERE status='active' should also be applied
    // at the database level — see schema.prisma note).
    try {
      // Prefer explicit numeric targetAmount from wizard; fall back to parsing body.goal text.
      // Wizard users now pass targetAmount directly so parseTargetAmount("Laptop") = 0 is bypassed.
      const targetAmount = (body.targetAmount != null && Number(body.targetAmount) > 0)
        ? Number(body.targetAmount)
        : parseTargetAmount(body.goal || '');
      const monthlyTarget = body.monthly != null && body.monthly !== '' ? Number(body.monthly) : null;
      const dueDate = mapTimeframeToDueDate(body.timeframe);

      // Compute startingBalance from the user's full transaction history at the moment
      // of goal creation. Only used when creating a new goal — editing never resets it.
      const allTxs = await prisma.transaction.findMany({ where: { userId: user.id } });
      let inc = 0, exp = 0;
      for (const t of allTxs) {
        if (t.type === 'income') inc += Number(t.amount);
        else if (t.type === 'expense') exp += Number(t.amount);
        // transfer: excluded from starting balance calculation
      }
      const startingBalance = inc - exp;

      await prisma.$transaction(async (tx) => {
        const existing = await tx.goal.findFirst({
          where: { userId: user.id, status: 'active' },
          orderBy: { createdAt: 'asc' },
        });
        if (existing) {
          // Edit path: update goal parameters but never reset startingBalance.
          // dueDate is only updated when the caller explicitly provides a timeframe
          // value. Omitting timeframe (e.g. from the Edit Profile page or ProfileEditor
          // component) preserves the existing deadline rather than clearing it.
          // monthlyTarget is only updated when body.monthly is explicitly present in
          // the request (not undefined). '' clears it (user deleted the value);
          // undefined means the field was not sent and the existing value is kept.
          const updateData = {
            // Canonical title: prefer goalType (wizard label), fall back to goal text, then keep existing
            title: body.goalType || body.goal || existing.title,
            targetAmount: targetAmount || existing.targetAmount,
          };
          if (body.monthly !== undefined) {
            updateData.monthlyTarget = body.monthly != null && body.monthly !== ''
              ? Number(body.monthly)
              : null;
          }
          if (body.timeframe) {
            updateData.dueDate = mapTimeframeToDueDate(body.timeframe);
          }
          await tx.goal.update({
            where: { id: existing.id },
            data: updateData,
          });
        } else if (targetAmount > 0) {
          // Create path: new goal with current balance as baseline.
          // Skipped when goal text is non-numeric (e.g. "Build better habits") so
          // we never persist a $0 goal. Onboarding still succeeds and AiInsight is
          // still saved; GoalRing shows "No savings goal set yet" until the user
          // provides a numeric target.
          await tx.goal.create({
            data: {
              userId: user.id,
              // Canonical title = wizard goalType label; fall back to goal text or generic
              title: body.goalType || body.goal || 'My savings goal',
              targetAmount,
              monthlyTarget,
              startingBalance,
              dueDate,
              status: 'active',
            },
          });
        }
      });
    } catch (goalErr) {
      console.error('Silent failure detected [onboarding:goal-upsert]', goalErr);
    }

    const res = NextResponse.json({ success: true, onboarding: input });
    // clear the must_onboard flag so middleware won't redirect again
    res.headers.append('Set-Cookie', 'must_onboard=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
    return res;
  }catch(err){
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

export async function GET(req){
  try{
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: 'Nice try. The bouncer says you’re not on the list 🕶️' }, { status: 401 });

    // Scan recent aiInsight rows and return the most recent one that looks like onboarding data.
    const records = await prisma.aiInsight.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
    if (!records || records.length === 0) return NextResponse.json({ onboarding: null });

    function normalizeInput(val){
      if (val == null) return null;
      if (typeof val === 'string'){
        try { return JSON.parse(val); } catch(e){ console.error('Silent failure detected [onboarding:parse-input]', e); return val; }
      }
      return val;
    }

    for (const r of records){
      let inputVal = normalizeInput(r.input);
      if (!inputVal) continue;
      // If onboarding was saved directly, `inputVal` will have `goal`, `monthly`, `reasons`, etc.
      if (inputVal.goal || inputVal.monthly || inputVal.reasons || inputVal.why) return NextResponse.json({ onboarding: inputVal });
      // Some records may have an `onboarding` field (e.g., insight snapshots)
      if (inputVal.onboarding && (inputVal.onboarding.goal || inputVal.onboarding.reasons)) return NextResponse.json({ onboarding: inputVal.onboarding });
      // also accept nested input_snapshot style
      if (inputVal.input_snapshot && inputVal.input_snapshot.onboarding) return NextResponse.json({ onboarding: inputVal.input_snapshot.onboarding });
    }

    // nothing found — return the most recent raw input as a fallback
    const fallback = normalizeInput(records[0].input) || null;
    return NextResponse.json({ onboarding: fallback });
  }catch(err){
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
