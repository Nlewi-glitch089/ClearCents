jest.mock('../lib/prisma.js', () => ({
  user: { findUnique: jest.fn() },
  aiInsight: { create: jest.fn() },
  goal: { findMany: jest.fn(async () => []) },
  category: { findMany: jest.fn(async () => []) },
  financialAction: { findMany: jest.fn(async () => []) },
}));

jest.mock('../lib/auth.js', () => ({
  parseCookies: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('../lib/openai.js', () => ({
  callChat: jest.fn(),
  hasApiKey: jest.fn(),
}));

jest.mock('../lib/ai.js', () => ({
  getAllTransactionsForUser: jest.fn(async () => []),
  getRecentTransactionsForUser: jest.fn(async () => []),
  summarizeTransactions: jest.fn(() => 'summary'),
  getRecentInsights: jest.fn(async () => []),
  getEmbedding: jest.fn(async () => null),
  cosine: jest.fn(() => 0),
  buildPrompt: jest.fn((q) => q),
  getOnboardingData: jest.fn(async () => null),
  buildCoachPrompt: jest.fn((q) => ({ systemPrompt: 'You are a coach.', userMessage: q })),
  computeTrendContext: jest.fn(() => ({
    categoryIncreases: [], categoryDecreases: [], savingsRateDelta: null,
    thisMonthSavingsRate: null, lastMonthSavingsRate: null,
    activeDaysThisMonth: 0, txCountThisMonth: 0,
  })),
}));

jest.mock('../lib/goalForecast.js', () => ({
  computeGoalForecast: jest.fn(() => ({
    monthlyContribution: null, projectedCompletionMonths: null,
    projectedCompletionDate: null, confidence: null,
  })),
  computeGoalMilestones: jest.fn(() => ({
    reached25: false, reached50: false, reached75: false, completed: false,
  })),
}));

jest.mock('../lib/goals.js', () => ({
  computeGoalProgress: jest.fn((goals) => goals),
}));

jest.mock('../lib/financialSignals.js', () => ({
  buildFinancialSignals: jest.fn(() => ({
    savingsRate: null,
    spendingChanges: [],
    consistency: null,
    goals: [],
    supportingSignals: [],
    supportingData: [],
  })),
}));

jest.mock('../lib/financialAlerts.js', () => ({
  buildFinancialAlerts: jest.fn(() => ({ alerts: [] })),
}));

jest.mock('../lib/financialMemory.js', () => ({
  buildFinancialMemory: jest.fn(() => ({
    recurringPatterns: [],
    improvingPatterns: [],
    worseningPatterns: [],
    newlyTriggeredAlerts: [],
    resolvedAlerts: [],
    ongoingAlerts: [],
    streaks: {},
    repeated: false,
  })),
}));

jest.mock('../lib/financialOpportunities.js', () => ({
  buildFinancialOpportunities: jest.fn(() => ({ opportunities: [] })),
  computeOpportunityScore: jest.fn(() => 0),
}));

jest.mock('../lib/actionPlans.js', () => ({
  buildActionPlans: jest.fn(() => ({ plans: [] })),
  computeActionPriority: jest.fn(() => 0),
}));

jest.mock('../lib/actionHistory.js', () => ({
  getActiveActionIds: jest.fn(() => []),
  suppressActiveOpportunities: jest.fn((opportunities) => opportunities),
  buildActionHistoryContext: jest.fn(() => ({ accepted: [], completed: [], dismissed: [] })),
  buildCompletionAlerts: jest.fn(() => []),
  computeActionSuccessRate: jest.fn(() => ({ accepted: 0, completed: 0, successRate: 0 })),
}));

jest.mock('../lib/financialStrategies.js', () => ({
  buildFinancialStrategies: jest.fn(() => ({ strategies: [] })),
  buildStrategyProgress: jest.fn(() => ({ completedActions: 0, totalActions: 0, percentComplete: 0 })),
  buildStrategyCompletionAlerts: jest.fn(() => []),
}));

jest.mock('../lib/financialReviews.js', () => ({
  buildFinancialReview: jest.fn(() => ({
    period: 'monthly',
    wins: [],
    concerns: [],
    completedActions: 0,
    activeStrategies: 0,
    topOpportunity: null,
    roadmapProgress: null,
  })),
  generateFinancialReview: jest.fn(() => ({ wins: [], concerns: [], actions: [], opportunities: [], strategies: [] })),
  computeReviewProgress: jest.fn(() => ({ resolved: false })),
}));

jest.mock('../lib/financialRoadmaps.js', () => ({
  buildFinancialRoadmap: jest.fn(() => ({ roadmap: null })),
  buildRoadmapCompletionAlert: jest.fn(() => null),
  buildRoadmapTimeline: jest.fn(() => []),
  computeRoadmapHealth: jest.fn(() => ({ score: 50, status: 'on_track' })),
}));

jest.mock('next/server', () => ({
  NextResponse: { json: jest.fn((body) => ({ body })) },
}));

import prisma from '../lib/prisma.js';
import { parseCookies, verifyToken } from '../lib/auth.js';
import { callChat, hasApiKey } from '../lib/openai.js';
import { buildFinancialSignals } from '../lib/financialSignals.js';
import { buildFinancialAlerts } from '../lib/financialAlerts.js';
import { buildFinancialMemory } from '../lib/financialMemory.js';
import { buildFinancialOpportunities } from '../lib/financialOpportunities.js';
import { buildActionPlans } from '../lib/actionPlans.js';
import { buildActionHistoryContext } from '../lib/actionHistory.js';
import { buildFinancialStrategies } from '../lib/financialStrategies.js';
import { buildFinancialReview } from '../lib/financialReviews.js';
import { buildFinancialRoadmap } from '../lib/financialRoadmaps.js';
import { POST } from '../app/api/ai/query/route.js';

function makeReq(bodyData = {}, cookieHeader = '') {
  return {
    headers: { get: jest.fn((k) => (k === 'cookie' ? cookieHeader : '')) },
    json: jest.fn(async () => bodyData),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  parseCookies.mockReturnValue({});
  prisma.user.findUnique.mockResolvedValue(null);
  prisma.aiInsight.create.mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// Null-content path
// ---------------------------------------------------------------------------
test('callChat null content: returns fallback string, saved:false, aiInsight.create not called', async () => {
  parseCookies.mockReturnValueOnce({ session: 'tok' });
  verifyToken.mockReturnValueOnce({ id: 'u1' });
  prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1' });
  hasApiKey.mockReturnValue(true);
  callChat.mockResolvedValueOnce({ content: null, source: 'provider-error' });

  const req = makeReq({ query: 'How much did I spend?' }, 'session=tok');
  const result = await POST(req);

  expect(result.body.answer).toContain('temporarily unavailable');
  expect(result.body.saved).toBe(false);
  expect(result.body.source).toBe('provider-error');
  expect(prisma.aiInsight.create).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// Valid-content path
// ---------------------------------------------------------------------------
test('callChat valid content: answer returned, source propagated', async () => {
  hasApiKey.mockReturnValue(true);
  callChat.mockResolvedValueOnce({ content: 'Great budgeting tip', source: 'openai' });

  const req = makeReq({ query: 'Give me a tip' });
  const result = await POST(req);

  expect(result.body.answer).toBe('Great budgeting tip');
  expect(result.body.source).toBe('openai');
  expect(result.body.saved).toBe(false); // guest — no persistence
});

// ---------------------------------------------------------------------------
// No API key → deterministic path
// ---------------------------------------------------------------------------
test('no OPENAI_API_KEY: deterministic fallback returns valid response without calling callChat', async () => {
  hasApiKey.mockReturnValue(false);

  const req = makeReq({ query: 'What is my balance?' });
  const result = await POST(req);

  expect(result.body.answer).toBeDefined();
  expect(result.body.source).toBe('deterministic');
  expect(result.body.saved).toBe(false);
  expect(callChat).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// Part 3: supportingSignals and supportingData in response
// ---------------------------------------------------------------------------

test('response always includes supportingSignals and supportingData arrays', async () => {
  hasApiKey.mockReturnValue(true);
  callChat.mockResolvedValueOnce({ content: 'Great tip!', source: 'openai' });

  const req = makeReq({ query: 'How am I doing?' });
  const result = await POST(req);

  expect(Array.isArray(result.body.supportingSignals)).toBe(true);
  expect(Array.isArray(result.body.supportingData)).toBe(true);
});

test('supportingSignals reflects active financial signals from buildFinancialSignals', async () => {
  buildFinancialSignals.mockReturnValueOnce({
    savingsRate: { current: 31, previous: 19, delta: 12 },
    spendingChanges: [{ category: 'Food', pctChange: 38, currentAmount: 187, previousAmount: 135 }],
    consistency: null,
    goals: [],
    supportingSignals: ['savings_rate_improvement', 'food_spending_increase'],
    supportingData: [{ label: 'Savings Rate', value: '+12 pts' }, { label: 'Food Spending', value: '+38%' }],
  });
  hasApiKey.mockReturnValue(true);
  callChat.mockResolvedValueOnce({ content: 'You improved!', source: 'openai' });

  const req = makeReq({ query: 'How did my savings change?' });
  const result = await POST(req);

  expect(result.body.supportingSignals).toContain('savings_rate_improvement');
  expect(result.body.supportingSignals).toContain('food_spending_increase');
  expect(result.body.supportingData).toContainEqual({ label: 'Savings Rate', value: '+12 pts' });
});

test('deterministic path also includes supportingSignals and supportingData', async () => {
  hasApiKey.mockReturnValue(false);

  const req = makeReq({ query: 'Am I doing well?' });
  const result = await POST(req);

  expect(Array.isArray(result.body.supportingSignals)).toBe(true);
  expect(Array.isArray(result.body.supportingData)).toBe(true);
});

// ---------------------------------------------------------------------------
// Part 4: alerts passed into coaching context
// ---------------------------------------------------------------------------

test('buildFinancialAlerts is called and route runs without error', async () => {
  buildFinancialAlerts.mockReturnValueOnce({
    alerts: [{ id: 'food_spike', severity: 'medium', tone: 'warning', title: 'Food spending increased', description: 'Food up 38%.', signalId: null }],
  });
  hasApiKey.mockReturnValue(true);
  callChat.mockResolvedValueOnce({ content: 'Watch that food spending.', source: 'openai' });

  const req = makeReq({ query: 'Should I worry about food?' });
  const result = await POST(req);

  expect(result.body.answer).toBe('Watch that food spending.');
  expect(buildFinancialAlerts).toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// Sprint 20G: memory-aware coaching
// ---------------------------------------------------------------------------

test('buildFinancialMemory is called and route runs without error', async () => {
  buildFinancialMemory.mockReturnValueOnce({
    recurringPatterns: [],
    improvingPatterns: ['savings_rate'],
    worseningPatterns: [],
    newlyTriggeredAlerts: [],
    resolvedAlerts: [],
    ongoingAlerts: [],
    streaks: {},
    repeated: false,
  });
  hasApiKey.mockReturnValue(true);
  callChat.mockResolvedValueOnce({ content: 'Great progress on savings!', source: 'openai' });

  const req = makeReq({ query: 'How are my savings?' });
  const result = await POST(req);

  expect(result.body.answer).toBe('Great progress on savings!');
  expect(buildFinancialMemory).toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// Sprint 20H: opportunity-aware coaching
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sprint 20I: action plan generation in query route
// ---------------------------------------------------------------------------

test('buildActionPlans is called and route runs without error', async () => {
  buildActionPlans.mockReturnValueOnce({
    plans: [
      { id: 'reduce_food_spending', title: 'Reduce food spending', description: 'Lower monthly food spending by $100.', impactScore: 65, estimatedMonthlyBenefit: 100, difficulty: 'medium', priorityScore: 75 },
    ],
  });
  hasApiKey.mockReturnValue(true);
  callChat.mockResolvedValueOnce({ content: 'Try reducing your food spending by $100.', source: 'openai' });

  const req = makeReq({ query: 'What should I do next?' });
  const result = await POST(req);

  expect(result.body.answer).toBe('Try reducing your food spending by $100.');
  expect(buildActionPlans).toHaveBeenCalled();
});

test('buildFinancialOpportunities is called and route runs without error', async () => {
  buildFinancialOpportunities.mockReturnValueOnce({
    opportunities: [
      { id: 'reduce_food_spending', category: 'spending', impactScore: 69, confidence: 'high', title: 'Reduce food spending', description: 'Food spending elevated.' },
    ],
  });
  hasApiKey.mockReturnValue(true);
  callChat.mockResolvedValueOnce({ content: 'Your highest priority is reducing food spending.', source: 'openai' });

  const req = makeReq({ query: 'What should I focus on?' });
  const result = await POST(req);

  expect(result.body.answer).toBe('Your highest priority is reducing food spending.');
  expect(buildFinancialOpportunities).toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// Sprint 20J: action history context in query route
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sprint 20K: strategy engine integration in query route
// ---------------------------------------------------------------------------

test('buildFinancialStrategies is called and route runs without error', async () => {
  parseCookies.mockReturnValueOnce({ session: 'tok' });
  verifyToken.mockReturnValueOnce({ id: 'u1' });
  prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1' });
  hasApiKey.mockReturnValue(true);
  callChat.mockResolvedValueOnce({ content: 'Here is your strategy plan.', source: 'openai' });

  const req = makeReq({ query: 'What strategy should I follow?' }, 'session=tok');
  const result = await POST(req);

  expect(result.body.answer).toBe('Here is your strategy plan.');
  expect(buildFinancialStrategies).toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// Sprint 20L: review engine integration in query route
// ---------------------------------------------------------------------------

test('buildFinancialReview is called and route runs without error', async () => {
  parseCookies.mockReturnValueOnce({ session: 'tok' });
  verifyToken.mockReturnValueOnce({ id: 'u1' });
  prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1' });
  hasApiKey.mockReturnValue(true);
  callChat.mockResolvedValueOnce({ content: 'Here is your financial review.', source: 'openai' });

  const req = makeReq({ query: 'How did I do this month?' }, 'session=tok');
  const result = await POST(req);

  expect(result.body.answer).toBe('Here is your financial review.');
  expect(buildFinancialReview).toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// Sprint 20M: roadmap engine integration in query route
// ---------------------------------------------------------------------------

test('buildFinancialRoadmap is called and route runs without error', async () => {
  parseCookies.mockReturnValueOnce({ session: 'tok' });
  verifyToken.mockReturnValueOnce({ id: 'u1' });
  prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1' });
  hasApiKey.mockReturnValue(true);
  callChat.mockResolvedValueOnce({ content: 'Here is your financial roadmap.', source: 'openai' });

  const req = makeReq({ query: 'Where am I going with my finances?' }, 'session=tok');
  const result = await POST(req);

  expect(result.body.answer).toBe('Here is your financial roadmap.');
  expect(buildFinancialRoadmap).toHaveBeenCalled();
});

test('buildActionHistoryContext is called and route runs without error', async () => {
  parseCookies.mockReturnValueOnce({ session: 'tok' });
  verifyToken.mockReturnValueOnce({ id: 'u1' });
  prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1' });
  hasApiKey.mockReturnValue(true);
  callChat.mockResolvedValueOnce({ content: 'Based on your history, keep going!', source: 'openai' });

  const req = makeReq({ query: 'How am I doing with my actions?' }, 'session=tok');
  const result = await POST(req);

  expect(result.body.answer).toBe('Based on your history, keep going!');
  expect(buildActionHistoryContext).toHaveBeenCalled();
});
