const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_MONTH = MS_PER_DAY * 30.4375;

/**
 * Forecasts goal completion based on net savings pace in the analysis window
 * (last 90 days, or since goal creation — whichever is more recent).
 *
 * A positive net contribution (income > expenses in the window) is required
 * to produce a forecast. When data is insufficient or the pace is negative,
 * all fields return null so the coach can say so rather than fabricating estimates.
 *
 * @param {Object} goal         Enriched goal from computeGoalProgress (needs remainingAmount)
 * @param {Array}  transactions Full transaction history for the user
 * @returns {{ monthlyContribution, projectedCompletionMonths, projectedCompletionDate, confidence }}
 */
export function computeGoalForecast(goal, transactions = []) {
  const nullResult = {
    monthlyContribution: null,
    projectedCompletionMonths: null,
    projectedCompletionDate: null,
    confidence: null,
  };
  if (!goal || !transactions.length) return nullResult;

  const now = new Date();
  const ninetyDaysAgo = new Date(now - 90 * MS_PER_DAY);
  const goalCreatedAt = goal.createdAt ? new Date(goal.createdAt) : null;

  // Window starts at the later of 90 days ago or goal creation, to avoid
  // counting pre-goal earnings as goal progress.
  const windowStart = goalCreatedAt && goalCreatedAt > ninetyDaysAgo
    ? goalCreatedAt
    : ninetyDaysAgo;

  const windowMs = now - windowStart;
  const windowMonths = windowMs / MS_PER_MONTH;

  // Require at least half a month of history before projecting
  if (windowMonths < 0.5) return nullResult;

  let income = 0;
  let expenses = 0;
  let txCount = 0;
  for (const t of transactions) {
    const date = t.occurredAt ? new Date(t.occurredAt) : null;
    if (!date || date < windowStart) continue;
    txCount++;
    if (t.type === 'income') income += Number(t.amount);
    else if (t.type === 'expense') expenses += Number(t.amount);
    // transfer: excluded — does not affect savings pace
  }

  const netContribution = income - expenses;
  // Negative or zero pace means no forward forecast is possible
  if (netContribution <= 0) return nullResult;

  const monthlyContribution = Math.round((netContribution / windowMonths) * 100) / 100;

  // remainingAmount comes from computeGoalProgress; fall back to raw calculation
  const remainingAmount = goal.remainingAmount != null
    ? Number(goal.remainingAmount)
    : Math.max(0, Number(goal.targetAmount || 0) - Number(goal.currentSaved || 0));

  if (remainingAmount <= 0) {
    return {
      monthlyContribution,
      projectedCompletionMonths: 0,
      projectedCompletionDate: now.toISOString().slice(0, 7) + '-01',
      confidence: 'high',
    };
  }

  const projectedCompletionMonths = Math.round((remainingAmount / monthlyContribution) * 10) / 10;
  const projectedDate = new Date(now.getTime() + projectedCompletionMonths * MS_PER_MONTH);
  const projectedCompletionDate = projectedDate.toISOString().slice(0, 7) + '-01';

  const confidence = windowMonths >= 2 && txCount >= 10 ? 'high'
    : windowMonths >= 1 && txCount >= 4 ? 'medium'
    : 'low';

  return { monthlyContribution, projectedCompletionMonths, projectedCompletionDate, confidence };
}

/**
 * Returns which standard savings milestones a goal has reached.
 * Single source of truth for progress achievements across coach and insight surfaces.
 *
 * @param {Object} goal   Enriched goal with progressPercent
 * @returns {{ reached25, reached50, reached75, completed }}
 */
export function computeGoalMilestones(goal) {
  const pct = Number(goal?.progressPercent || 0);
  return {
    reached25: pct >= 25,
    reached50: pct >= 50,
    reached75: pct >= 75,
    completed: pct >= 100,
  };
}
