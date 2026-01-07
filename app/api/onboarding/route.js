import prisma from '../../../lib/prisma.js';
import { parseCookies, verifyToken } from '../../../lib/auth.js';
import { NextResponse } from 'next/server';

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
    const input = body;
    const output = `Onboarding saved: ${body.goal || 'no goal provided'}`;
    // write JSON directly so Prisma stores a proper JSON object
    await prisma.aiInsight.create({ data: { userId: user.id, input: input, output } });
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
