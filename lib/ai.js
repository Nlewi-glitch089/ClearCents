import prisma from './prisma.js';
import { JOURNEY_STATES } from './userState.js';

function truncateText(s, n = 1000) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '...' : s;
}

export async function getRecentTransactionsForUser(userId, limit = 50) {
  return prisma.transaction.findMany({ where: { userId }, orderBy: { occurredAt: 'desc' }, take: limit });
}

export async function getAllTransactionsForUser(userId) {
  return prisma.transaction.findMany({ where: { userId }, orderBy: { occurredAt: 'desc' } });
}

export function summarizeTransactions(txs = [], maxEntries = 8, categoryMap = {}) {
  const recent = txs.slice(0, maxEntries);
  const totals = recent.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + Number(t.amount);
    acc.byCategory = acc.byCategory || {};
    const cat = categoryMap[t.categoryId] || t.description || 'uncategorized';
    acc.byCategory[cat] = (acc.byCategory[cat] || 0) + Number(t.amount);
    return acc;
  }, {});

  const income = (totals.income || 0).toFixed(2);
  const expenses = (totals.expense || 0).toFixed(2);
  const balance = (Number(income) - Number(expenses)).toFixed(2);

  const lines = recent.map(t => {
    const label = categoryMap[t.categoryId] || t.description || '';
    return `${t.type === 'income' ? '+' : '-'}$${Number(t.amount).toFixed(2)} ${label}`.trim();
  });

  return `Summary: ${recent.length} recent transactions. Income: $${income}. Expenses: $${expenses}. Balance: $${balance}. Transactions: ${lines.join('; ')}.`;
}

export async function getRecentInsights(userId, limit = 6) {
  return prisma.aiInsight.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit });
}

export async function getOnboardingData(userId) {
  // Type-filtered query — reliable for records written after type-stamping was introduced
  try {
    const typed = await prisma.aiInsight.findFirst({
      where: { userId, input: { path: ['type'], equals: 'onboarding' } },
      orderBy: { createdAt: 'desc' },
    });
    if (typed) {
      const data = typeof typed.input === 'string' ? JSON.parse(typed.input) : typed.input;
      if (data && data.type === 'onboarding') return data;
    }
  } catch {
    // JSON path filtering unavailable on this adapter — fall through to heuristic scan
  }

  // Heuristic fallback for records written before type-stamping was added
  const records = await prisma.aiInsight.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  for (const r of records) {
    let input = null;
    try { input = typeof r.input === 'string' ? JSON.parse(r.input) : r.input; } catch { continue; }
    if (!input || input.type === 'chat') continue;
    if (Array.isArray(input.reasons) || input.goal || input.monthly || input.why) return input;
    if (input.onboarding && (input.onboarding.goal || input.onboarding.reasons)) return input.onboarding;
  }
  return null;
}

/**
 * Syncs a renamed Goal title back into the onboarding AiInsight JSON so that
 * legacy fields (goalType, goal) stay consistent with the canonical Goal record.
 * Non-critical — failures are logged but never propagate to the caller.
 */
export async function syncOnboardingGoalTitle(userId, newTitle) {
  try {
    let targetId = null;
    let targetInput = null;

    // Prefer type-filtered query (fast path)
    try {
      const typed = await prisma.aiInsight.findFirst({
        where: { userId, input: { path: ['type'], equals: 'onboarding' } },
        orderBy: { createdAt: 'desc' },
      });
      if (typed) {
        const data = typeof typed.input === 'string' ? JSON.parse(typed.input) : typed.input;
        if (data?.type === 'onboarding') { targetId = typed.id; targetInput = data; }
      }
    } catch { /* JSON path filtering unavailable on this adapter */ }

    // Heuristic fallback
    if (!targetId) {
      const records = await prisma.aiInsight.findMany({
        where: { userId }, orderBy: { createdAt: 'desc' }, take: 200,
      });
      for (const r of records) {
        let input = null;
        try { input = typeof r.input === 'string' ? JSON.parse(r.input) : r.input; } catch { continue; }
        if (!input || input.type === 'chat') continue;
        if (input.goalType || input.goal || Array.isArray(input.reasons)) {
          targetId = r.id; targetInput = input; break;
        }
      }
    }

    if (!targetId || !targetInput) return;
    await prisma.aiInsight.update({
      where: { id: targetId },
      data: { input: { ...targetInput, goalType: newTitle, goal: newTitle } },
    });
  } catch (e) {
    console.error('[goals:sync-onboarding]', e);
  }
}

export async function getEmbedding(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const body = { model: 'text-embedding-3-small', input: truncateText(text, 2000) };
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data && data.data && data.data[0]) return data.data[0].embedding;
    return null;
  } catch {
    return null;
  }
}

export function cosine(a = [], b = []) {
  if (!a || !b || a.length !== b.length) return -1;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return -1;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Computes month-over-month trend signals and logging consistency from a full
 * transaction history. Pass a categoryMap ({id → name}) for readable labels.
 *
 * Returns null fields when insufficient data (e.g. no income last month means
 * savingsRateDelta will be null). Callers should handle nulls gracefully.
 */
export function computeTrendContext(transactions = [], categoryMap = {}) {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonth = { income: 0, expenses: 0, byCategory: {} };
  const lastMonth = { income: 0, expenses: 0, byCategory: {} };
  const activeDaysThisMonth = new Set();
  let txCountThisMonth = 0;

  for (const t of transactions) {
    const d = new Date(t.occurredAt || t.createdAt);
    const amt = Number(t.amount);
    const isThisMonth = d >= thisMonthStart && d < nextMonthStart;
    const isLastMonth = d >= lastMonthStart && d < thisMonthStart;

    if (isThisMonth) {
      txCountThisMonth++;
      activeDaysThisMonth.add(d.toISOString().slice(0, 10));
      if (t.type === 'income') thisMonth.income += amt;
      else if (t.type === 'expense') {
        thisMonth.expenses += amt;
        const key = categoryMap[t.categoryId] || t.description || 'Uncategorized';
        thisMonth.byCategory[key] = (thisMonth.byCategory[key] || 0) + amt;
      }
      // transfer: excluded from income, expense, and category buckets
    }
    if (isLastMonth) {
      if (t.type === 'income') lastMonth.income += amt;
      else if (t.type === 'expense') {
        lastMonth.expenses += amt;
        const key = categoryMap[t.categoryId] || t.description || 'Uncategorized';
        lastMonth.byCategory[key] = (lastMonth.byCategory[key] || 0) + amt;
      }
      // transfer: excluded from income, expense, and category buckets
    }
  }

  const thisMonthSavingsRate = thisMonth.income > 0
    ? Math.round(((thisMonth.income - thisMonth.expenses) / thisMonth.income) * 100)
    : null;
  const lastMonthSavingsRate = lastMonth.income > 0
    ? Math.round(((lastMonth.income - lastMonth.expenses) / lastMonth.income) * 100)
    : null;
  const savingsRateDelta = thisMonthSavingsRate !== null && lastMonthSavingsRate !== null
    ? thisMonthSavingsRate - lastMonthSavingsRate
    : null;

  // Only include categories with spending in both months (avoids division by zero)
  const categoryTrends = Object.keys(thisMonth.byCategory)
    .filter(key => (lastMonth.byCategory[key] || 0) > 0)
    .map(key => ({
      name: key,
      thisMonthAmount: Math.round(thisMonth.byCategory[key] * 100) / 100,
      lastMonthAmount: Math.round(lastMonth.byCategory[key] * 100) / 100,
      pctChange: Math.round(
        ((thisMonth.byCategory[key] - lastMonth.byCategory[key]) / lastMonth.byCategory[key]) * 100
      ),
    }));

  const categoryIncreases = categoryTrends.filter(t => t.pctChange > 0).sort((a, b) => b.pctChange - a.pctChange);
  const categoryDecreases = categoryTrends.filter(t => t.pctChange < 0).sort((a, b) => a.pctChange - b.pctChange);

  return {
    thisMonth,
    lastMonth,
    thisMonthSavingsRate,
    lastMonthSavingsRate,
    savingsRateDelta,
    categoryIncreases,
    categoryDecreases,
    activeDaysThisMonth: activeDaysThisMonth.size,
    txCountThisMonth,
  };
}

function getStatePreamble(state) {
  switch (state) {
    case JOURNEY_STATES.GUEST:
      return [
        'COACHING MODE: Guest (not signed in)',
        'The person asking has not created an account. You have no financial data for them.',
        'Demonstrate what the ClearCents AI Coach can do once they sign up — be specific and welcoming.',
        'Do NOT reference any financial history, balances, or transactions.',
        'End with a brief, non-pushy encouragement to create a free account.',
      ].join('\n');

    case JOURNEY_STATES.NEEDS_ONBOARDING:
      return [
        'COACHING MODE: New user — no profile context collected yet',
        'The user has an account but has not shared their financial situation or goals.',
        'Do NOT give financial advice yet — you have no meaningful context.',
        'Ask 2–3 focused questions to understand: their income type (regular/gig/irregular), their main financial goal, and their biggest money challenge.',
        'Keep the tone welcoming. Many users are completely new to tracking money.',
      ].join('\n');

    case JOURNEY_STATES.NEEDS_FIRST_TRANSACTION:
      return [
        'COACHING MODE: Onboarded user — no transactions logged yet',
        'CRITICAL: Any $0.00 values in the financial summary reflect an empty transaction history, not a zero balance.',
        'Do NOT analyze, reference, or comment on zero figures as if they represent real financial data.',
        'Encourage the user to log their first income or expense.',
        'Explain that once they start logging, you can give them real, personalized insights.',
        'Reference their onboarding goal or situation if available to make the response feel personal.',
      ].join('\n');

    case JOURNEY_STATES.NEEDS_GOAL:
      return [
        'COACHING MODE: Active tracker — no savings goal set',
        'The user has logged transactions. You CAN discuss their spending patterns and balances.',
        'However, they have not set a savings goal yet — do NOT reference goal progress.',
        'If it fits naturally in the conversation, encourage them to set a savings goal.',
      ].join('\n');

    case JOURNEY_STATES.ACTIVE_USER:
    default:
      return [
        'COACHING MODE: Active user',
        'Full context available. Reference the user\'s real financial data, goal progress, and spending patterns.',
      ].join('\n');
  }
}

export function buildCoachPrompt(query, coachingContext = {}, selectedContexts = []) {
  const {
    user, financial, goals, onboarding, recentTransactions,
    topCategories, journeyState, trends, consistency, signals, alerts, memory, opportunities, actions, actionHistory, strategies, review, roadmap,
  } = coachingContext;
  const sections = [];

  if (user?.firstName) {
    sections.push(`[User: ${user.firstName}]`);
  }

  if (financial) {
    let s = `[Financial Summary]\nIncome: $${financial.income.toFixed(2)} | Expenses: $${financial.expenses.toFixed(2)} | Balance: $${financial.balance.toFixed(2)}`;
    if (financial.savingsRate !== null && financial.savingsRate !== undefined) {
      s += `\nAll-time savings rate: ${financial.savingsRate.toFixed(1)}%`;
    }
    sections.push(s);
  }

  if (goals && goals.length > 0) {
    const goalLines = goals.map(g => {
      const lines = [];
      let header = `- "${g.title}": target $${Number(g.targetAmount).toFixed(2)}`;
      if (g.dueDate) {
        const d = new Date(g.dueDate);
        header += ` (due ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`;
      }
      lines.push(header);

      if (Number(g.targetAmount) > 0) {
        lines.push(`  Saved: $${Number(g.currentSaved || 0).toFixed(2)} (${g.progressPercent || 0}%) · Remaining: $${Number(g.remainingAmount || 0).toFixed(2)}`);
      }

      if (g.monthlyTarget != null) {
        const pace = Number(g.monthlyPaceActual || 0).toFixed(2);
        const onTrackStr = g.isOnTrack === true ? 'yes' : g.isOnTrack === false ? 'no' : 'unknown';
        lines.push(`  Monthly target: $${Number(g.monthlyTarget).toFixed(2)} · Actual pace: $${pace}/month · On track: ${onTrackStr}`);
      }

      if (g.requiredMonthlyToHitTarget != null) {
        lines.push(`  Required to stay on schedule: $${Number(g.requiredMonthlyToHitTarget).toFixed(2)}/month`);
      }

      if (Number(g.goalAgeMonths) > 0) {
        lines.push(`  Goal age: ${Number(g.goalAgeMonths).toFixed(1)} months`);
      }

      return lines.join('\n');
    });
    sections.push(`[Savings Goals]\n${goalLines.join('\n')}`);
    sections.push('[Goal Status]\nPrimary goal source: Goal record');

    // [Goal Forecast] — completion date estimate based on savings pace
    const forecastLines = [];
    for (const g of goals) {
      const f = g.forecast;
      if (f?.projectedCompletionDate && f.monthlyContribution > 0) {
        const d = new Date(f.projectedCompletionDate);
        const monthName = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        forecastLines.push(g.title);
        forecastLines.push(`Average monthly progress: $${f.monthlyContribution.toFixed(2)}`);
        forecastLines.push(`Estimated completion: ${monthName}`);
        forecastLines.push(`Forecast confidence: ${f.confidence}`);
      }
    }
    sections.push(forecastLines.length > 0
      ? `[Goal Forecast]\n${forecastLines.join('\n')}`
      : '[Goal Forecast]\nNot enough history to estimate completion date.'
    );

    // [Goal Milestones] — which progress thresholds have been crossed
    const milestoneLines = [];
    for (const g of goals) {
      const m = g.milestones;
      if (!m) continue;
      if (m.completed) milestoneLines.push(`${g.title} goal is complete.`);
      else if (m.reached75) milestoneLines.push(`${g.title} has reached 75% progress.`);
      else if (m.reached50) milestoneLines.push(`${g.title} has reached 50% progress.`);
      else if (m.reached25) milestoneLines.push(`${g.title} has reached 25% progress.`);
    }
    if (milestoneLines.length > 0) {
      sections.push(`[Goal Milestones]\n${milestoneLines.join('\n')}`);
    }
  } else if (onboarding && (onboarding.goalType || onboarding.goal)) {
    sections.push('[Goal Status]\nPrimary goal source: Onboarding only\nNo target amount has been defined yet.');
  }

  if (onboarding) {
    const lines = [];

    // Suppress the goal label when a Goal record already shows it in [Savings Goals] above
    const goalLabel = onboarding.goalType || onboarding.goal;
    if (goalLabel && !(goals && goals.length > 0)) {
      lines.push(`Saving for: ${goalLabel}`);
    }

    // Income type — prefer the explicit field, fall back to legacy `why` encoding
    const incomeDisplay = onboarding.incomeType
      || (onboarding.why ? onboarding.why.replace('Income type: ', '') : null);
    if (incomeDisplay) lines.push(`Income type: ${incomeDisplay}`);

    if (onboarding.monthly) lines.push(`Monthly target: $${Number(onboarding.monthly).toFixed(2)}`);

    // Coaching focus — prefer explicit field, fall back to legacy `reasons` array
    const focusDisplay = onboarding.coachingFocus
      || (Array.isArray(onboarding.reasons) && onboarding.reasons.length > 0 ? onboarding.reasons.join(', ') : null);
    if (focusDisplay) lines.push(`Coaching focus: ${focusDisplay}`);

    if (lines.length > 0) sections.push(`[About This User]\n${lines.join('\n')}`);
  }

  if (recentTransactions && recentTransactions.length > 0) {
    const txLines = recentTransactions.map(t => {
      const sign = t.type === 'income' ? '+' : '-';
      const label = t.categoryName || t.description || '';
      return `${sign}$${Number(t.amount).toFixed(2)} ${label}`.trim();
    });
    sections.push(`[Recent Transactions]\n${txLines.join('\n')}`);
  }

  if (topCategories && topCategories.length > 0) {
    const catLines = topCategories.map(c => `${c.name}: $${c.total.toFixed(2)} (${c.count} transaction${c.count !== 1 ? 's' : ''})`);
    sections.push(`[Top Spending Categories]\n${catLines.join('\n')}`);
  }

  if (trends) {
    const trendLines = [];
    if (trends.categoryIncreases.length > 0) {
      const top = trends.categoryIncreases[0];
      trendLines.push(`${top.name} spending +${top.pctChange}% vs last month ($${top.thisMonthAmount.toFixed(2)} vs $${top.lastMonthAmount.toFixed(2)})`);
    }
    if (trends.categoryDecreases.length > 0) {
      const top = trends.categoryDecreases[0];
      trendLines.push(`${top.name} spending ${top.pctChange}% vs last month ($${top.thisMonthAmount.toFixed(2)} vs $${top.lastMonthAmount.toFixed(2)})`);
    }
    if (trends.savingsRateDelta !== null && trends.savingsRateDelta !== 0) {
      const dir = trends.savingsRateDelta > 0 ? 'up' : 'down';
      trendLines.push(`Monthly savings rate ${dir} ${Math.abs(trends.savingsRateDelta)} pts: ${trends.lastMonthSavingsRate}% → ${trends.thisMonthSavingsRate}%`);
    }
    if (trendLines.length > 0) {
      sections.push(`[Month-over-Month Trends]\n${trendLines.join('\n')}`);
    }
  }

  if (consistency && consistency.activeDaysThisMonth !== undefined) {
    const days = consistency.activeDaysThisMonth;
    const label = days >= 20 ? 'excellent'
      : days >= 10 ? 'strong'
      : days >= 3 ? 'building'
      : days >= 1 ? 'getting started'
      : 'none this month';
    sections.push(`[Logging Consistency]\nActive logging days this month: ${days} (${label})`);
  }

  if (alerts && alerts.length > 0) {
    const grouped = { high: [], medium: [], low: [] };
    for (const a of alerts) (grouped[a.severity] || grouped.medium).push(a);
    const alertLines = [];
    for (const [level, list] of [['HIGH', grouped.high], ['MEDIUM', grouped.medium], ['LOW', grouped.low]]) {
      if (list.length > 0) {
        alertLines.push(level);
        for (const a of list) alertLines.push(a.description);
        alertLines.push('');
      }
    }
    while (alertLines.length && alertLines[alertLines.length - 1] === '') alertLines.pop();
    sections.push(`[Financial Alerts]\n${alertLines.join('\n')}`);
  }

  // [Financial Memory] — improving/worsening/resolved patterns from previous insight cycles
  if (memory) {
    const memLines = [];
    if (memory.improvingPatterns?.length > 0) {
      memLines.push('Improving:');
      for (const p of memory.improvingPatterns) memLines.push(`- ${p.replace(/_/g, ' ')}`);
    }
    if (memory.worseningPatterns?.length > 0) {
      if (memLines.length > 0) memLines.push('');
      memLines.push('Worsening:');
      for (const p of memory.worseningPatterns) memLines.push(`- ${p.replace(/_/g, ' ')}`);
    }
    if (memory.resolvedAlerts?.length > 0) {
      if (memLines.length > 0) memLines.push('');
      memLines.push('Resolved:');
      for (const id of memory.resolvedAlerts) memLines.push(`- ${id.replace(/_/g, ' ')}`);
    }
    if (memLines.length > 0) sections.push(`[Financial Memory]\n${memLines.join('\n')}`);
  }

  // [Historical Context] — consecutive streak data for sustained signals
  if (memory?.streaks && Object.keys(memory.streaks).length > 0) {
    const ctxLines = [];
    for (const [signalId, count] of Object.entries(memory.streaks)) {
      ctxLines.push(`${signalId.replace(/_/g, ' ')} has continued for ${count} consecutive period${count !== 1 ? 's' : ''}.`);
    }
    if (ctxLines.length > 0) sections.push(`[Historical Context]\n${ctxLines.join('\n')}`);
  }

  // [Financial Opportunities] — scored, ranked coaching priorities
  if (opportunities && opportunities.length > 0) {
    const grouped = { high: [], medium: [], low: [] };
    for (const op of opportunities) {
      if (op.impactScore >= 70) grouped.high.push(op);
      else if (op.impactScore >= 40) grouped.medium.push(op);
      else grouped.low.push(op);
    }
    const opLines = [];
    for (const [tier, list] of [['HIGH IMPACT', grouped.high], ['MEDIUM IMPACT', grouped.medium], ['LOW IMPACT', grouped.low]]) {
      if (list.length > 0) {
        opLines.push(tier);
        for (const op of list) opLines.push(op.description);
        opLines.push('');
      }
    }
    while (opLines.length && opLines[opLines.length - 1] === '') opLines.pop();
    sections.push(`[Financial Opportunities]\n${opLines.join('\n')}`);
  }

  // [Recommended Actions] — prioritized, specific actions derived from opportunities
  if (actions && actions.length > 0) {
    const grouped = { high: [], medium: [], low: [] };
    for (const a of actions) {
      if (a.priorityScore >= 70) grouped.high.push(a);
      else if (a.priorityScore >= 40) grouped.medium.push(a);
      else grouped.low.push(a);
    }
    const actionLines = [];
    for (const [tier, list] of [['HIGH PRIORITY', grouped.high], ['MEDIUM PRIORITY', grouped.medium], ['LOW PRIORITY', grouped.low]]) {
      if (list.length > 0) {
        actionLines.push(tier);
        for (const a of list) {
          actionLines.push(a.description);
          if (a.estimatedMonthlyBenefit > 0) {
            actionLines.push(`Expected benefit: $${a.estimatedMonthlyBenefit * 12}/year.`);
          }
          actionLines.push('');
        }
      }
    }
    while (actionLines.length && actionLines[actionLines.length - 1] === '') actionLines.pop();
    sections.push(`[Recommended Actions]\n${actionLines.join('\n')}`);
  }

  // [Action History] — persistent behavioral record of accepted, completed, and dismissed actions
  if (actionHistory) {
    const histLines = [];
    if (actionHistory.accepted?.length > 0) {
      histLines.push('Accepted:');
      for (const t of actionHistory.accepted) histLines.push(`- ${t}`);
    }
    if (actionHistory.completed?.length > 0) {
      if (histLines.length > 0) histLines.push('');
      histLines.push('Completed:');
      for (const t of actionHistory.completed) histLines.push(`- ${t}`);
    }
    if (actionHistory.dismissed?.length > 0) {
      if (histLines.length > 0) histLines.push('');
      histLines.push('Dismissed:');
      for (const t of actionHistory.dismissed) histLines.push(`- ${t}`);
    }
    if (histLines.length > 0) sections.push(`[Action History]\n${histLines.join('\n')}`);
  }

  // [Financial Strategies] — coordinated multi-action plans with tracked progress
  if (strategies && strategies.length > 0) {
    const grouped = { high: [], medium: [], low: [] };
    for (const s of strategies) {
      if (s.priorityScore >= 70) grouped.high.push(s);
      else if (s.priorityScore >= 40) grouped.medium.push(s);
      else grouped.low.push(s);
    }
    const stratLines = [];
    for (const [tier, list] of [['HIGH PRIORITY', grouped.high], ['MEDIUM PRIORITY', grouped.medium], ['LOW PRIORITY', grouped.low]]) {
      if (list.length === 0) continue;
      stratLines.push(tier);
      for (const s of list) {
        stratLines.push('');
        stratLines.push(s.title);
        if (s.actionTitles?.length > 0) {
          stratLines.push('');
          stratLines.push('Actions:');
          for (const t of s.actionTitles) stratLines.push(`- ${t}`);
        }
        if (s.progress) {
          stratLines.push('');
          stratLines.push('Progress:');
          stratLines.push(`${s.progress.completedActions} of ${s.progress.totalActions} actions completed`);
        }
      }
      stratLines.push('');
    }
    while (stratLines.length && stratLines[stratLines.length - 1] === '') stratLines.pop();
    if (stratLines.length > 0) sections.push(`[Financial Strategies]\n${stratLines.join('\n')}`);
  }

  // [Latest Review] — narrative recap of wins, concerns, and strategy progress
  if (review) {
    const reviewLines = [];
    if (review.wins?.length > 0) {
      reviewLines.push('Wins:');
      for (const w of review.wins) reviewLines.push(`- ${w}`);
    }
    if (review.concerns?.length > 0) {
      if (reviewLines.length > 0) reviewLines.push('');
      reviewLines.push('Concerns:');
      for (const c of review.concerns) reviewLines.push(`- ${c}`);
    }
    if (review.activeStrategies > 0) {
      if (reviewLines.length > 0) reviewLines.push('');
      const stratLabel = review.activeStrategies === 1 ? 'strategy' : 'strategies';
      reviewLines.push(`Active ${stratLabel}: ${review.activeStrategies}`);
    }
    if (reviewLines.length > 0) sections.push(`[Latest Review]\n${reviewLines.join('\n')}`);
  }

  // [Financial Roadmap] — destination-aware long-term plan with milestones and completion estimate
  if (roadmap) {
    const rmLines = [];
    if (roadmap.currentGoal?.title) {
      rmLines.push(`Current Stage:\n${roadmap.currentGoal.title}`);
    }
    if (roadmap.nextMilestone?.title) {
      rmLines.push(`\nNext Milestone:\n${roadmap.nextMilestone.title}`);
    }
    if (roadmap.projectedCompletionDate) {
      const parts = roadmap.projectedCompletionDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      rmLines.push(`\nProjected Completion:\n${label}`);
    }
    if (rmLines.length > 0) sections.push(`[Financial Roadmap]\n${rmLines.join('')}`);
  }

  if (selectedContexts.length > 0) {
    const pastLines = selectedContexts.map((c, i) => `Context ${i + 1}: ${truncateText(c, 500)}`);
    sections.push(`[Past Context]\n${pastLines.join('\n')}`);
  }

  if (signals) {
    const evidenceLines = [];
    for (const sc of (signals.spendingChanges || [])) {
      if (sc.pctChange > 0) {
        evidenceLines.push(`${sc.category} spending increased ${sc.pctChange}% compared with last month ($${Number(sc.currentAmount).toFixed(2)} vs $${Number(sc.previousAmount).toFixed(2)}).`);
        evidenceLines.push('Source: month-over-month category comparison.');
      } else if (sc.pctChange < 0) {
        evidenceLines.push(`${sc.category} spending decreased ${Math.abs(sc.pctChange)}% compared with last month ($${Number(sc.currentAmount).toFixed(2)} vs $${Number(sc.previousAmount).toFixed(2)}).`);
        evidenceLines.push('Source: month-over-month category comparison.');
      }
    }
    if (signals.savingsRate?.delta != null && signals.savingsRate.delta !== 0) {
      const dir = signals.savingsRate.delta > 0 ? 'improved' : 'declined';
      evidenceLines.push(`Savings rate ${dir} by ${Math.abs(signals.savingsRate.delta)} percentage points (${signals.savingsRate.previous}% → ${signals.savingsRate.current}%).`);
      evidenceLines.push('Source: monthly income vs expense calculation.');
    }
    for (const gs of (signals.goals || [])) {
      if (gs.forecastMonths != null && gs.forecastMonths > 0) {
        evidenceLines.push(`${gs.title} goal forecast: estimated completion in ${gs.forecastMonths} month${gs.forecastMonths !== 1 ? 's' : ''}.`);
        evidenceLines.push('Source: average monthly goal contributions.');
      }
    }
    if (evidenceLines.length > 0) {
      sections.push(`[Evidence]\n${evidenceLines.join('\n')}`);
    }
  }

  sections.push(`[Reasoning Rules]\nOnly reference metrics explicitly provided in this prompt.\nDo not estimate missing values.\nDo not invent percentages, spending amounts, goal completion dates, savings rates, or category trends.\nIf insufficient information exists, state that additional data is needed.`);

  const statePreamble = getStatePreamble(journeyState);
  const systemPrompt = `${statePreamble}

You are a personal financial coach for ClearCents — a budgeting tool built for first-time earners, gig workers, and anyone starting from scratch.

Only reference numbers and facts that appear in the data provided. If data is missing or you cannot answer specifically, say so directly — do not give generic advice when specific data is available, and do not invent numbers.`;

  const contextBlock = sections.join('\n\n');
  const userMessage = contextBlock ? `${contextBlock}\n\nQuestion: ${query}` : `Question: ${query}`;

  return { systemPrompt, userMessage };
}

export function buildPrompt(query, contexts = []) {
  const ctx = contexts.map((c, i) => `Context ${i+1}: ${truncateText(c, 1000)}`).join('\n\n');
  return `You are a helpful, concise assistant specialized in personal finance for students. Use the provided context when answering.
\n${ctx}\n\nUser question: ${query}\n\nAnswer briefly and cite context lines when relevant.`;
}
