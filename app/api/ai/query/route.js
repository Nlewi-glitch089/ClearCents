import prisma from '../../../../lib/prisma.js';
import { parseCookies, verifyToken } from '../../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { getAllTransactionsForUser, summarizeTransactions, getRecentInsights, getEmbedding, cosine, buildPrompt, getOnboardingData, buildCoachPrompt, computeTrendContext } from '../../../../lib/ai.js';
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
import { callChat, hasApiKey } from '../../../../lib/openai.js';
import { getUserJourneyState, JOURNEY_STATES } from '../../../../lib/userState.js';

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
    const body = await req.json().catch(() => ({}));
    const query = (body.query || '').trim();
    if (!query) return NextResponse.json({ error: 'Query received, but it made no sense to us 🤷‍♀️' }, { status: 400 });
    if (query.length > 2000) return NextResponse.json({ error: 'That query is doing way too much. Please calm it down.' }, { status: 400 });

    // Fetch all coaching context data in parallel; each fetch fails independently.
    // getAllTransactionsForUser fetches the FULL transaction history (no window limit).
    // This is required so that financial totals and computeGoalProgress use the same
    // dataset as GET /api/goals, guaranteeing dashboard, profile, and coach show
    // identical numbers (Correction 1 — single source of truth for goal progress).
    let txs = [];
    let goals = [];
    let categories = [];
    let onboarding = null;
    const insights = [];
    let financialActions = [];

    if (user) {
      const [txResult, insightResult, goalResult, categoryResult, onboardingResult, actionHistResult] = await Promise.allSettled([
        getAllTransactionsForUser(user.id),
        getRecentInsights(user.id, 6),
        prisma.goal.findMany({ where: { userId: user.id, status: 'active' }, orderBy: { createdAt: 'asc' } }),
        prisma.category.findMany({ where: { userId: user.id } }),
        getOnboardingData(user.id),
        prisma.financialAction.findMany({ where: { userId: user.id }, orderBy: { acceptedAt: 'desc' }, take: 20 }),
      ]);

      if (txResult.status === 'fulfilled') txs = txResult.value;
      if (insightResult.status === 'fulfilled') insights.push(...insightResult.value);
      if (goalResult.status === 'fulfilled') goals = goalResult.value;
      if (categoryResult.status === 'fulfilled') categories = categoryResult.value;
      if (onboardingResult.status === 'fulfilled') onboarding = onboardingResult.value;
      if (actionHistResult.status === 'fulfilled') financialActions = actionHistResult.value;
    } else if (Array.isArray(body.transactions)) {
      txs = body.transactions.slice(0, 100);
    }

    const journeyState = getUserJourneyState({ user, transactions: txs, goals, onboarding });
    const hasKey = hasApiKey();
    const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

    // Financial totals computed from full transaction history for accuracy
    let income = 0, expensesTotal = 0;
    for (const tx of txs) {
      if (tx.type === 'income') income += Number(tx.amount);
      else if (tx.type === 'expense') expensesTotal += Number(tx.amount);
      // transfer: excluded from income and expense totals
    }
    const balance = income - expensesTotal;
    const savingsRate = income > 0 ? (balance / income) * 100 : null;

    // Top categories across full transaction history
    const catTotals = {};
    for (const tx of txs) {
      if (tx.type !== 'expense') continue;
      const name = categoryMap[tx.categoryId] || tx.description || 'Uncategorized';
      if (!catTotals[name]) catTotals[name] = { total: 0, count: 0 };
      catTotals[name].total += Number(tx.amount);
      catTotals[name].count += 1;
    }
    const topCategories = Object.entries(catTotals)
      .map(([name, d]) => ({ name, total: d.total, count: d.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Display context: most recent 15 transactions only
    const recentTransactions = txs.slice(0, 15).map(tx => {
      const txDate = tx.occurredAt || tx.createdAt;
      return {
        type: tx.type,
        amount: Number(tx.amount),
        description: tx.description || '',
        categoryName: categoryMap[tx.categoryId] || tx.description || '',
        date: txDate ? new Date(txDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      };
    });

    // Enrich goal records with computed progress using the same full transaction
    // dataset — guarantees the coach reports identical numbers to the dashboard
    const enrichedGoals = computeGoalProgress(goals, txs);
    // Attach forecast and milestones directly to each enriched goal so buildCoachPrompt
    // can reference them without a separate context field.
    for (const g of enrichedGoals) {
      g.forecast = computeGoalForecast(g, txs);
      g.milestones = computeGoalMilestones(g);
    }

    // Trend context: month-over-month signals visible on the dashboard but previously
    // invisible to the coach. Computed from the same full transaction set.
    const trends = computeTrendContext(txs, categoryMap);
    const consistency = { activeDaysThisMonth: trends.activeDaysThisMonth, txCountThisMonth: trends.txCountThisMonth };

    // Structured financial signals — single computation path shared by Coach and Insight
    const signals = buildFinancialSignals({
      summary: user ? { income, expenses: expensesTotal, balance, savingsRate } : null,
      goals: enrichedGoals,
      trends: user ? trends : null,
      consistency: user ? consistency : null,
    });

    // Alert engine — converts signals into prioritized, actionable financial events
    const alertResult = buildFinancialAlerts({ summary: user ? { income, expenses: expensesTotal, balance, savingsRate } : null, trends: user ? trends : null, goals: enrichedGoals, signals });

    // Financial memory — pattern continuity derived from persisted insight history
    const memory = buildFinancialMemory({
      currentSignals: signals.supportingSignals,
      currentAlerts: alertResult.alerts,
      previousInsights: insights,
    });

    // Opportunity engine — ranked coaching priorities
    const opportunityResult = buildFinancialOpportunities({
      alerts: alertResult.alerts,
      signals,
      memory,
      goals: enrichedGoals,
      summary: user ? { income, expenses: expensesTotal, balance, savingsRate } : null,
    });

    // Suppress opportunities with active accepted actions; build history context
    const activeActionIds = getActiveActionIds(financialActions);
    const filteredOpportunities = suppressActiveOpportunities(opportunityResult.opportunities, activeActionIds);
    const completionAlerts = buildCompletionAlerts(financialActions);
    const allAlerts = [...alertResult.alerts, ...completionAlerts];
    const actionHistory = buildActionHistoryContext(financialActions);

    // Action plan engine — converts opportunities into specific, trackable actions
    const actionResult = buildActionPlans({
      opportunities: filteredOpportunities,
      goals: enrichedGoals,
      summary: user ? { income, expenses: expensesTotal, balance, savingsRate } : null,
    });

    // Strategy engine — aggregates action plans into coordinated multi-step plans
    const actionSuccessRate = computeActionSuccessRate(financialActions);
    const strategyResult = buildFinancialStrategies({
      actions: actionResult.plans,
      opportunities: filteredOpportunities,
      goals: enrichedGoals,
      summary: user ? { income, expenses: expensesTotal, balance, savingsRate } : null,
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
    const allStrategicAlerts = [...allAlerts, ...strategyAlerts, ...(roadmapCompletionAlert ? [roadmapCompletionAlert] : [])];

    // Review engine — synthesizes context into a structured recap for the coach
    const review = buildFinancialReview({
      summary: user ? { income, expenses: expensesTotal, balance, savingsRate } : null,
      signals: user ? signals : null,
      alerts: user ? allStrategicAlerts : [],
      memory: user ? memory : null,
      actions: financialActions,
      strategies: strategiesWithProgress,
      period: 'monthly',
      roadmap: user ? roadmap : null,
    });

    // Build candidate context texts for embedding ranking (unchanged behavior)
    const contexts = [];
    if (txs.length > 0) contexts.push(summarizeTransactions(txs, 15, categoryMap));
    for (const insight of insights) {
      if (insight?.output) contexts.push(`Past insight: ${insight.output}`);
      let inputData = null;
      try { inputData = typeof insight?.input === 'string' ? JSON.parse(insight.input) : insight?.input; } catch { inputData = null; }
      if (insight?.input && inputData?.type !== 'chat') {
        contexts.push(`Past input: ${JSON.stringify(insight.input)}`);
      }
    }

    // Use embeddings to rank contexts if key available (unchanged)
    let selectedContexts = contexts.slice(0, 3);
    if (hasKey && contexts.length > 0) {
      try {
        const qEmb = await getEmbedding(query);
        const ctxEmbs = await Promise.all(contexts.map(c => getEmbedding(c)));
        const scored = [];
        for (let i = 0; i < contexts.length; i++) {
          const emb = ctxEmbs[i];
          if (!emb || !qEmb) continue;
          scored.push({ idx: i, score: cosine(qEmb, emb) });
        }
        scored.sort((a, b) => b.score - a.score);
        selectedContexts = scored.slice(0, 3).map(s => contexts[s.idx]);
      } catch (e) {
        selectedContexts = contexts.slice(0, 3);
      }
    }

    let answer = '';
    let source = 'deterministic';

    if (hasKey) {
      const firstName = user ? (user.name?.split(' ')[0] || user.email?.split('@')[0] || null) : null;
      const coachingContext = {
        journeyState,
        user: user ? { firstName } : null,
        financial: user ? { income, expenses: expensesTotal, balance, savingsRate } : null,
        goals: enrichedGoals,
        onboarding,
        recentTransactions: user ? recentTransactions : [],
        topCategories: user ? topCategories : [],
        trends: user ? trends : null,
        consistency: user ? consistency : null,
        signals: user ? signals : null,
        alerts: user ? allStrategicAlerts : [],
        memory: user ? memory : null,
        opportunities: user ? filteredOpportunities : [],
        actions: user ? actionResult.plans : [],
        actionHistory: user ? actionHistory : null,
        strategies: user ? strategiesWithProgress : [],
        review: user ? review : null,
        roadmap: user ? roadmap : null,
      };

      let { systemPrompt, userMessage } = buildCoachPrompt(query, coachingContext, selectedContexts);

      if (!user) {
        systemPrompt += ' You are speaking with a guest who has no account and no saved transaction data. Answer their question with general financial education first — be genuinely helpful. Then briefly explain what information you would need to give a personalized answer. Do not refuse or deflect the question. Mention that creating a free account enables personalized analysis, but make this a closing note, not your main response.';
      }

      if (/\b(resource|recommend|recommendation|link|suggest|where can I|what should I use|alternat(e|ive))\b/i.test(query)) {
        systemPrompt += ' When the user asks for resources or recommendations, include one short URL and a one-line description for it, explain briefly why it might help, and offer one alternative recommendation.';
        systemPrompt += ' Do not recommend or promote third-party budgeting apps (for example, do not name Mint, YNAB, or similar products). If asked about budgeting tools, either suggest general budgeting features, link to an educational resource titled "Budgeting Apps" or to the site\'s /help pages, or provide neutral, non-branded resources.';
      }

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ];

      const result = await callChat({ messages, maxTokens: 800, temperature: 0.2 });
      if (result.content === null) {
        return NextResponse.json({ answer: 'Our AI coach is temporarily unavailable. Try again in a moment, or ask something specific like "How much did I spend on food?"', saved: false, source: 'provider-error' });
      }
      answer = result.content;
      source = result.source;
    } else {
      const txCount = txs.length;
      const guestAnswer = (q) => {
        const lower = q.toLowerCase();
        const cta = '\n\nCreate a free account and log your income and expenses — then I can give you real analysis based on your actual numbers instead of general guidance.';
        if (/sav(e|ing|ings)|enough/i.test(lower)) {
          return `A solid target is saving 15–20% of take-home income (the 50/30/20 rule puts savings at 20%). Whether you're personally on track depends on your specific income, expenses, and goals — there's no universal right answer.${cta}`;
        }
        if (/spend(ing)?|expense|where.*money|most.*money/i.test(lower)) {
          return `Most people's top categories are housing, food, and transportation — but recurring subscriptions and dining out often add up faster than expected. I'd need to see your actual transactions to tell you where your money is specifically going.${cta}`;
        }
        if (/goal|reach|target|on.?track/i.test(lower)) {
          return `Whether you'll reach a goal on time comes down to two numbers: how much you've saved so far and your average monthly savings rate. With those, the forecast is straightforward — but right now I don't have your data to work with.${cta}`;
        }
        if (/budget/i.test(lower)) {
          return `Budgeting works best when it's built around your real income and spending. A common starting point is the 50/30/20 split — 50% needs, 30% wants, 20% savings — but what actually matters is whether your categories add up to less than your income.${cta}`;
        }
        if (/habit|pattern|behav|consistent/i.test(lower)) {
          return `Strong money habits usually come down to logging consistently, reviewing weekly, and adjusting before the month ends rather than after. The hard part is seeing your own patterns clearly — which requires transaction data to work with.${cta}`;
        }
        return `Good question — but answering it well depends on your specific numbers. In general, healthy finances mean knowing your income, keeping spending below it, and making steady progress toward a clear goal. I can give you a real analysis once you've logged some transactions.${cta}`;
      };
      const stateAnswers = {
        [JOURNEY_STATES.GUEST]: guestAnswer(query),
        [JOURNEY_STATES.NEEDS_ONBOARDING]:
          "Welcome! To coach you well, I'd like to know a little about your situation first. What type of income do you have — regular paycheck, gig work, or something irregular? And what's the main financial goal you're working toward right now?",
        [JOURNEY_STATES.NEEDS_FIRST_TRANSACTION]:
          "You're all set up — the next step is logging your first transaction. Add an income or expense entry and I'll immediately be able to show you what's happening with your money.",
        [JOURNEY_STATES.NEEDS_GOAL]:
          `You have ${txCount} transaction${txCount !== 1 ? 's' : ''} logged. I can see your spending patterns — setting a savings goal would let me track your progress and give you more targeted coaching.`,
        [JOURNEY_STATES.ACTIVE_USER]:
          `You have ${txCount} transaction${txCount !== 1 ? 's' : ''} logged. Ask me something specific — like "How much did I spend on food?" or "Am I on track for my goal?"`,
      };
      answer = stateAnswers[journeyState] ?? stateAnswers[JOURNEY_STATES.ACTIVE_USER];
      source = 'deterministic';
    }

    if (user) {
      await prisma.aiInsight.create({
        data: { userId: user.id, input: { type: 'chat', query }, output: answer },
      });
      return NextResponse.json({ answer, saved: true, source, supportingSignals: signals.supportingSignals, supportingData: signals.supportingData });
    }

    return NextResponse.json({ answer, saved: false, source, supportingSignals: signals.supportingSignals, supportingData: signals.supportingData });
  } catch (err) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
