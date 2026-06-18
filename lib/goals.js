/**
 * Pure goal computation utilities — no database calls, no side effects.
 *
 * computeGoalProgress is the SOLE source of goal progress numbers in this
 * application. It is called by:
 *   - GET /api/goals  (user-facing display, uses full transaction history)
 *   - app/api/ai/query/route.js  (coaching context, uses full transaction history)
 *
 * Both consumers MUST pass the same transaction dataset so that the dashboard,
 * profile page, and AI coach always display identical numbers. Do not call this
 * function with a windowed slice of transactions — always pass the full set.
 */

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.4375;

/**
 * Computes progress fields for a list of goals against a full transaction dataset.
 *
 * startingBalance may be null for users whose Goal records were backfilled from
 * onboarding data — their original balance at onboarding time is not recoverable.
 * For these users we fall back to 0, making currentSaved equal to the raw all-time
 * balance. This is a known migration tradeoff: historical progress is slightly
 * optimistic because it counts all earnings since account creation rather than only
 * earnings since the goal was set. Users who onboard after Sprint 12 have an accurate
 * startingBalance and see correct delta-based progress.
 *
 * @param {Array} goals        Raw Goal records from Prisma
 * @param {Array} transactions Full transaction history for the user (no window limit)
 * @returns {Array}            Goals with computed progress fields appended
 */
export function computeGoalProgress(goals = [], transactions = []) {
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    if (t.type === 'income') income += Number(t.amount);
    else if (t.type === 'expense') expenses += Number(t.amount);
    // transfer transactions are excluded — they do not affect the income/expense balance
  }
  const currentBalance = income - expenses;
  const now = new Date();

  return goals.map(g => {
    const targetAmount = Number(g.targetAmount) || 0;
    const monthlyTarget = g.monthlyTarget != null ? Number(g.monthlyTarget) : null;

    // null startingBalance → treat as 0; see module-level comment on migration tradeoff
    const startingBalance = g.startingBalance != null ? Number(g.startingBalance) : 0;

    const currentSaved = Math.max(0, currentBalance - startingBalance);
    const progressPercent = targetAmount > 0
      ? Math.min(100, Math.round((currentSaved / targetAmount) * 100))
      : 0;
    const remainingAmount = Math.max(0, targetAmount - currentSaved);

    const goalAgeMs = Math.max(0, now - new Date(g.createdAt));
    const goalAgeMonths = Math.round((goalAgeMs / MS_PER_MONTH) * 10) / 10;
    const monthlyPaceActual = goalAgeMonths > 0
      ? Math.round((currentSaved / goalAgeMonths) * 100) / 100
      : 0;

    let monthsRemaining = null;
    let requiredMonthlyToHitTarget = null;
    if (g.dueDate) {
      const rawMs = new Date(g.dueDate) - now;
      monthsRemaining = Math.max(0, Math.round((rawMs / MS_PER_MONTH) * 10) / 10);
      requiredMonthlyToHitTarget = monthsRemaining > 0
        ? Math.round((remainingAmount / monthsRemaining) * 100) / 100
        : null;
    }

    const isOnTrack = monthlyTarget !== null ? monthlyPaceActual >= monthlyTarget : null;

    return {
      id: g.id,
      title: g.title,
      targetAmount,
      monthlyTarget,
      startingBalance,
      dueDate: g.dueDate || null,
      status: g.status,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt || null,
      currentSaved: Math.round(currentSaved * 100) / 100,
      progressPercent,
      remainingAmount: Math.round(remainingAmount * 100) / 100,
      goalAgeMonths,
      monthlyPaceActual,
      monthsRemaining,
      requiredMonthlyToHitTarget,
      isOnTrack,
    };
  });
}

/**
 * Extracts a savings target amount from free-text goal input.
 *
 * Supports:  "$500"  |  "save 500"  |  "500 dollars"  |  "need 2,000 for a laptop"
 * Rejects:   4-digit years (1900–2099), zero, negative values
 *
 * Priority order:
 *   1. Dollar-sign prefix   "$500 by June"          → 500
 *   2. "N dollars" suffix   "500 dollars"            → 500
 *   3. Bare standalone num  "save 500 by June 2027"  → 500  (2027 skipped as year)
 */
export function parseTargetAmount(goalText) {
  if (!goalText) return 0;
  const s = String(goalText).trim();

  // Priority 1: explicit dollar-sign prefix
  const dollarMatch = s.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/);
  if (dollarMatch) {
    const n = Number(dollarMatch[1].replace(/,/g, ''));
    if (n > 0) return n;
  }

  // Priority 2: number followed by "dollar(s)"
  const wordMatch = s.match(/(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*dollars?/i);
  if (wordMatch) {
    const n = Number(wordMatch[1].replace(/,/g, ''));
    if (n > 0) return n;
  }

  // Priority 3: any standalone number that is not a calendar year (1900–2099)
  const nums = s.match(/\b(\d+(?:,\d{3})*(?:\.\d{1,2})?)\b/g) || [];
  for (const raw of nums) {
    const n = Number(raw.replace(/,/g, ''));
    if (n >= 1900 && n <= 2099) continue;
    if (n > 0) return n;
  }

  return 0;
}

/**
 * Resolves the canonical primary goal for a user from two possible sources:
 *   1. The first active Goal record (authoritative — has real progress tracking)
 *   2. Onboarding data (fallback — qualitative label only, no progress tracking)
 *
 * Every UI surface and AI context must call this instead of reading
 * onboarding.goalType / onboarding.goal directly, so that a Goal record edit
 * automatically propagates everywhere without a separate sync step.
 *
 * @param {Array}  goals      Goal records (already filtered to active), typically from /api/goals
 * @param {Object} onboarding Onboarding snapshot from getOnboardingData() or /api/onboarding
 * @returns {{ title, targetAmount, onboardingOnly? } | null}
 */
export function getPrimaryGoal(goals = [], onboarding = null) {
  if (goals?.length) {
    return goals[0];
  }
  const title = onboarding?.goalType || onboarding?.goal;
  if (title) {
    return { title, targetAmount: null, onboardingOnly: true };
  }
  return null;
}

/**
 * Converts a timeframe label to an absolute Date offset from fromDate.
 * Returns null for unrecognized or empty values.
 */
export function mapTimeframeToDueDate(timeframe, fromDate = new Date()) {
  if (!timeframe) return null;
  const base = new Date(fromDate);
  switch (String(timeframe).trim().toLowerCase()) {
    case '1 month':  base.setMonth(base.getMonth() + 1);        return base;
    case '3 months': base.setMonth(base.getMonth() + 3);        return base;
    case '6 months': base.setMonth(base.getMonth() + 6);        return base;
    case '1 year':   base.setFullYear(base.getFullYear() + 1);  return base;
    default:         return null;
  }
}
