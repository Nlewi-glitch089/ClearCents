import prisma from '../../../../lib/prisma.js';
import { parseCookies, verifyToken } from '../../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { callStructured, hasApiKey } from '../../../../lib/openai.js';
import { getOnboardingData, buildCoachPrompt, computeTrendContext, getRecentInsights } from '../../../../lib/ai.js';
import { getUserJourneyState, JOURNEY_STATES } from '../../../../lib/userState.js';
import { computeGoalProgress } from '../../../../lib/goals.js';
import { computeGoalForecast, computeGoalMilestones } from '../../../../lib/goalForecast.js';
import { buildFinancialSignals } from '../../../../lib/financialSignals.js';
import { buildFinancialAlerts } from '../../../../lib/financialAlerts.js';
import { buildFinancialMemory } from '../../../../lib/financialMemory.js';
import { buildFinancialOpportunities } from '../../../../lib/financialOpportunities.js';
import { buildActionPlans } from '../../../../lib/actionPlans.js';
import { getActiveActionIds, suppressActiveOpportunities, buildActionHistoryContext, buildCompletionAlerts, computeActionSuccessRate } from '../../../../lib/actionHistory.js';
import { buildFinancialStrategies, buildStrategyProgress, buildStrategyCompletionAlerts } from '../../../../lib/financialStrategies.js';
import { buildFinancialReview } from '../../../../lib/financialReviews.js';
import { buildFinancialRoadmap, buildRoadmapCompletionAlert } from '../../../../lib/financialRoadmaps.js';

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

export async function POST(req) {
  try {
    const user = await getUserFromReq(req);
    let body = {};
    try { body = await req.json(); } catch (e) { console.error('Silent failure detected [ai-insight:parse-body]', e); body = {}; }

    let txs = [];
    let goals = [];
    let serverOnboarding = null;
    let categories = [];
    let previousInsights = [];
    let financialActions = [];

    if (user) {
      const [txResult, goalResult, onboardingResult, categoryResult, insightResult, actionResult] = await Promise.allSettled([
        prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { occurredAt: 'desc' } }),
        prisma.goal.findMany({ where: { userId: user.id, status: 'active' }, take: 1 }),
        getOnboardingData(user.id),
        prisma.category.findMany({ where: { userId: user.id } }),
        getRecentInsights(user.id, 6),
        prisma.financialAction.findMany({ where: { userId: user.id }, orderBy: { acceptedAt: 'desc' }, take: 20 }),
      ]);
      if (txResult.status === 'fulfilled') txs = txResult.value;
      if (goalResult.status === 'fulfilled') goals = goalResult.value;
      if (onboardingResult.status === 'fulfilled') serverOnboarding = onboardingResult.value;
      if (categoryResult.status === 'fulfilled') categories = categoryResult.value;
      if (insightResult.status === 'fulfilled') previousInsights = insightResult.value;
      if (actionResult.status === 'fulfilled') financialActions = actionResult.value;
    } else {
      if (Array.isArray(body.transactions) && body.transactions.length > 0) txs = body.transactions.slice(0, 50);
    }

    const onboarding = serverOnboarding || body.onboarding || null;
    const journeyState = getUserJourneyState({ user, transactions: txs, goals, onboarding });

    // State-specific early returns for states where no financial analysis is possible or appropriate
    const emptyDetails = { income: 0, expenses: 0, balance: 0, savingsRate: null, topCategories: [], suggestions: [] };

    if (journeyState === JOURNEY_STATES.GUEST) {
      return NextResponse.json({
        insight: 'Example insight: "Your top spending category last week was Food ($47). Your income covered all expenses with $23 left over — a 17% savings rate." Sign in to see your real numbers.',
        details: { ...emptyDetails, suggestions: ['Create a free account to unlock personalized insights.'] },
        saved: false,
        source: 'example',
      });
    }

    if (journeyState === JOURNEY_STATES.NEEDS_ONBOARDING) {
      return NextResponse.json({
        insight: 'Complete your setup to tell the coach about your goals and situation — then your first insight will be built around your actual life, not a generic template.',
        details: { ...emptyDetails, suggestions: ['Answer a few setup questions so your coach knows what to focus on.'] },
        saved: false,
        source: 'guidance',
      });
    }

    if (journeyState === JOURNEY_STATES.NEEDS_FIRST_TRANSACTION) {
      const goalHint = onboarding?.goalType
        ? ` You mentioned your goal is: ${onboarding.goalType}.`
        : onboarding?.goal ? ` You mentioned your goal is: ${onboarding.goal}.` : '';
      return NextResponse.json({
        insight: `Your profile is ready.${goalHint} Log your first income or expense and your AI Coach will immediately generate insights based on your real numbers.`,
        details: { ...emptyDetails, suggestions: ['Log your first income or expense to unlock coaching.'] },
        saved: false,
        source: 'guidance',
      });
    }

    // --- Full coaching context for NEEDS_GOAL and ACTIVE_USER ---

    const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

    // Resolve category names on transactions (supplements the category table lookup)
    for (const t of txs) {
      if (t.category?.name) categoryMap[t.category.id || t.categoryId || t.category.name] = t.category.name;
    }

    // Financial totals from full history
    let income = 0, expenses = 0;
    for (const t of txs) {
      if (t.type === 'income') income += Number(t.amount);
      else if (t.type === 'expense') expenses += Number(t.amount);
      // transfer: excluded from income and expense totals
    }
    const balance = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : null;

    // Top spending categories with count (format expected by buildCoachPrompt)
    const catTotals = {};
    for (const t of txs) {
      if (t.type !== 'expense') continue;
      const name = categoryMap[t.categoryId] || t.description || 'Uncategorized';
      if (!catTotals[name]) catTotals[name] = { total: 0, count: 0 };
      catTotals[name].total += Number(t.amount);
      catTotals[name].count++;
    }
    const topCategories = Object.entries(catTotals)
      .map(([name, d]) => ({ name, total: d.total, count: d.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Enrich goals with computed progress (same dataset as dashboard and coach)
    const enrichedGoals = computeGoalProgress(goals, txs);
    for (const g of enrichedGoals) {
      g.forecast = computeGoalForecast(g, txs);
      g.milestones = computeGoalMilestones(g);
    }

    // Trend and consistency signals
    const trends = computeTrendContext(txs, categoryMap);
    const consistency = { activeDaysThisMonth: trends.activeDaysThisMonth, txCountThisMonth: trends.txCountThisMonth };

    // Structured financial signals — shared computation path with query route
    const signals = buildFinancialSignals({
      summary: { income, expenses, balance, savingsRate },
      goals: enrichedGoals,
      trends,
      consistency,
    });

    // Alert engine — proactive events surfaced to insight panel and coach
    const alertResult = buildFinancialAlerts({ summary: { income, expenses, balance, savingsRate }, trends, goals: enrichedGoals, signals });

    // Financial memory — pattern continuity across insight cycles
    const memory = buildFinancialMemory({
      currentSignals: signals.supportingSignals,
      currentAlerts: alertResult.alerts,
      previousInsights,
    });

    // Opportunity engine — ranked coaching priorities from signals, alerts, memory
    const opportunityResult = buildFinancialOpportunities({
      alerts: alertResult.alerts,
      signals,
      memory,
      goals: enrichedGoals,
      summary: { income, expenses, balance, savingsRate },
    });

    // Suppress opportunities that already have an active accepted action
    const activeActionIds = getActiveActionIds(financialActions);
    const filteredOpportunities = suppressActiveOpportunities(opportunityResult.opportunities, activeActionIds);

    // Completion alerts — surface completed actions as positive signals
    const completionAlerts = buildCompletionAlerts(financialActions);

    // Action history context for coach prompt
    const actionHistory = buildActionHistoryContext(financialActions);

    // Action plan engine — converts opportunities into specific, trackable actions
    const actionResult = buildActionPlans({
      opportunities: filteredOpportunities,
      goals: enrichedGoals,
      summary: { income, expenses, balance, savingsRate },
    });

    // Strategy engine — aggregates action plans into coordinated multi-step plans
    const actionSuccessRate = computeActionSuccessRate(financialActions);
    const strategyResult = buildFinancialStrategies({
      actions: actionResult.plans,
      opportunities: filteredOpportunities,
      goals: enrichedGoals,
      summary: { income, expenses, balance, savingsRate },
      memory: actionSuccessRate,
    });
    const strategiesWithProgress = strategyResult.strategies.map(s => ({
      ...s,
      progress: buildStrategyProgress(s, financialActions),
    }));
    const strategyAlerts = buildStrategyCompletionAlerts(strategyResult.strategies, financialActions);

    // Roadmap engine — long-term destination plan connecting goals, strategies, and milestones
    const { roadmap } = buildFinancialRoadmap({ goals: enrichedGoals, strategies: strategiesWithProgress, actions: financialActions });
    const roadmapCompletionAlert = buildRoadmapCompletionAlert(roadmap);
    const allAlerts = [...alertResult.alerts, ...completionAlerts, ...strategyAlerts, ...(roadmapCompletionAlert ? [roadmapCompletionAlert] : [])];

    // Review engine — synthesizes signals, alerts, actions, and strategies into a structured recap
    const review = buildFinancialReview({
      summary: { income, expenses, balance, savingsRate },
      signals,
      alerts: allAlerts,
      memory,
      actions: financialActions,
      strategies: strategiesWithProgress,
      period: 'monthly',
      roadmap,
    });

    // Recent transactions for context window
    const firstName = user ? (user.name?.split(' ')[0] || user.email?.split('@')[0] || null) : null;
    const recentTransactions = txs.slice(0, 15).map(t => ({
      type: t.type,
      amount: Number(t.amount),
      description: t.description || '',
      categoryName: categoryMap[t.categoryId] || t.description || '',
    }));

    const coachingContext = {
      journeyState,
      user: user ? { firstName } : null,
      financial: { income, expenses, balance, savingsRate },
      goals: enrichedGoals,
      onboarding,
      recentTransactions,
      topCategories,
      trends,
      consistency,
      signals,
      alerts: allAlerts,
      memory: user ? memory : null,
      opportunities: user ? filteredOpportunities : [],
      actions: user ? actionResult.plans : [],
      actionHistory: user ? actionHistory : null,
      strategies: user ? strategiesWithProgress : [],
      review: user ? review : null,
      roadmap: user ? roadmap : null,
    };

    const hasKey = hasApiKey();
    let insight = '';
    let suggestions = [];
    let source = 'deterministic';

    if (hasKey) {
      const { systemPrompt, userMessage } = buildCoachPrompt(
        'Generate a brief financial insight.',
        coachingContext,
        []
      );
      // Append JSON instruction — the base prompt provides full coaching context;
      // we just need the response in a structured format for the insight panel.
      const insightSystemPrompt = `${systemPrompt}\n\nReturn ONLY a JSON object like {"insight":"...","suggestions":["...","..."]}. The insight should be 2-3 sentences max. Include 2-3 specific, actionable suggestions grounded in the provided data.`;

      const messages = [
        { role: 'system', content: insightSystemPrompt },
        { role: 'user', content: userMessage },
      ];

      const result = await callStructured({ messages, maxTokens: 350, temperature: 0.6, model: 'gpt-3.5-turbo' });
      if (result.content === null) {
        insight = buildDeterministicInsight(txs.length, income, expenses, balance);
        suggestions = buildDeterministicSuggestions(expenses, income);
        source = 'deterministic';
      } else {
        try {
          const parsed = JSON.parse(result.content);
          insight = parsed.insight || '';
          if (Array.isArray(parsed.suggestions)) suggestions = parsed.suggestions.slice(0, 4);
        } catch (e) {
          console.error('LLM parse failed [ai-insight:parse-response]', e);
          insight = result.content;
        }
        source = result.source;
      }
    } else {
      insight = buildDeterministicInsight(txs.length, income, expenses, balance);
      suggestions = buildDeterministicSuggestions(expenses, income);
      source = 'deterministic';
    }

    if (journeyState === JOURNEY_STATES.NEEDS_GOAL && !suggestions.some(s => /goal/i.test(s))) {
      suggestions.push('Set a savings goal to track your progress and unlock more targeted coaching.');
    }

    // topCategories in details uses `amount` for dashboard compatibility (dashboard reads c.amount)
    const detailsTopCategories = topCategories.map(c => ({ name: c.name, amount: c.total }));

    const primaryGoal = enrichedGoals[0] || null;
    const goalProgressDetails = primaryGoal ? {
      title: primaryGoal.title,
      progress: primaryGoal.progressPercent,
      forecastMonths: primaryGoal.forecast?.projectedCompletionMonths ?? null,
    } : null;

    const details = {
      income,
      expenses,
      balance,
      savingsRate: savingsRate === null ? null : Number(savingsRate.toFixed(1)),
      topCategories: detailsTopCategories,
      suggestions,
      goalProgress: goalProgressDetails,
    };

    const alertSummary = allAlerts.map(a => ({ id: a.id, severity: a.severity }));
    const memorySummary = {
      improvingPatterns: memory.improvingPatterns,
      worseningPatterns: memory.worseningPatterns,
      resolvedAlerts: memory.resolvedAlerts,
    };
    const opportunitySummary = opportunityResult.opportunities.map(o => ({
      id: o.id,
      score: o.impactScore,
      generatedAt: new Date().toISOString(),
    }));
    const actionSummary = actionResult.plans.map(p => ({
      id: p.id,
      priorityScore: p.priorityScore,
      generatedAt: new Date().toISOString(),
    }));
    const strategySummary = strategyResult.strategies.map(s => ({
      id: s.id,
      priorityScore: s.priorityScore,
      generatedAt: new Date().toISOString(),
    }));

    if (user) {
      const inputSnapshot = { count: txs.length, onboarding: onboarding || null, signals: signals.supportingSignals, alerts: alertSummary, memory: memorySummary, opportunities: opportunitySummary, actions: actionSummary, strategies: strategySummary };
      const saveOps = [
        prisma.aiInsight.create({ data: { userId: user.id, input: inputSnapshot, output: insight } }),
      ];
      // Guard: financialReview model may not be in the generated client if prisma generate
      // has not been run since the model was added to schema.prisma.
      if (typeof prisma.financialReview?.create === 'function') {
        saveOps.push(prisma.financialReview.create({ data: { userId: user.id, period: review.period, content: review } }));
      }
      await Promise.allSettled(saveOps);
      return NextResponse.json({ insight, details, saved: true, source: source || 'unknown', signals: signals.supportingSignals, alerts: allAlerts, memory, opportunities: filteredOpportunities, actions: actionResult.plans, strategies: strategiesWithProgress, review, roadmap });
    } else {
      return NextResponse.json({ insight, details, saved: false, message: 'Sign in to save insights and history.', source: source || 'deterministic', signals: signals.supportingSignals, alerts: allAlerts, memory, opportunities: filteredOpportunities, actions: actionResult.plans, strategies: strategiesWithProgress, review, roadmap });
    }
  } catch (err) {
    console.error('[ai-insight:route-error]', err);
    return NextResponse.json({ error: err.message || String(err), hint: 'Check server logs for full stack trace.' }, { status: 500 });
  }
}

function buildDeterministicInsight(txCount, income, expenses, balance) {
  let text = `You have ${txCount} transactions. Total income: $${income.toFixed(2)}; total expenses: $${expenses.toFixed(2)}. Balance: $${balance.toFixed(2)}.`;
  if (expenses > income) text += ' You are spending more than you earn — consider trimming expenses.';
  return text;
}

function buildDeterministicSuggestions(expenses, income) {
  if (expenses > income) {
    return ['Review recurring subscriptions and cancel unused ones.', 'Set a small weekly spending limit and track purchases.'];
  }
  return ['Consider moving a portion of your leftover to a savings bucket each pay period.', 'Set a short-term goal and automatically deposit a fixed amount into savings.'];
}
