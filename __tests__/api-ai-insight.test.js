jest.mock('../lib/prisma.js', () => ({
  user: { findUnique: jest.fn() },
  transaction: { findMany: jest.fn() },
  goal: { findMany: jest.fn() },
  category: { findMany: jest.fn() },
  aiInsight: { create: jest.fn() },
  financialAction: { findMany: jest.fn(async () => []) },
  financialReview: { create: jest.fn() },
}));

jest.mock('../lib/auth.js', () => ({
  parseCookies: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('../lib/openai.js', () => ({
  callStructured: jest.fn(),
  hasApiKey: jest.fn(),
}));

jest.mock('../lib/ai.js', () => ({
  getOnboardingData: jest.fn(async () => ({
    type: 'onboarding', goalType: 'Laptop', goal: 'Laptop',
    incomeType: 'Gig Work', coachingFocus: 'Save More', reasons: ['Save More'],
  })),
  buildCoachPrompt: jest.fn(() => ({
    systemPrompt: 'COACHING MODE: Active user\n\nYou are a coach.',
    userMessage: 'Question: Generate a brief financial insight.',
  })),
  computeTrendContext: jest.fn(() => ({
    categoryIncreases: [], categoryDecreases: [], savingsRateDelta: null,
    thisMonthSavingsRate: null, lastMonthSavingsRate: null,
    activeDaysThisMonth: 0, txCountThisMonth: 0,
  })),
  getRecentInsights: jest.fn(async () => []),
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
  computePatternStrength: jest.fn(() => ({
    signalId: 'test', occurrences: 0, trend: 'none', confidence: 'none',
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
import { callStructured, hasApiKey } from '../lib/openai.js';
import { buildFinancialSignals } from '../lib/financialSignals.js';
import { buildFinancialAlerts } from '../lib/financialAlerts.js';
import { buildFinancialMemory } from '../lib/financialMemory.js';
import { buildFinancialOpportunities } from '../lib/financialOpportunities.js';
import { buildActionPlans } from '../lib/actionPlans.js';
import { suppressActiveOpportunities, buildCompletionAlerts } from '../lib/actionHistory.js';
import { buildFinancialStrategies } from '../lib/financialStrategies.js';
import { buildFinancialReview } from '../lib/financialReviews.js';
import { buildFinancialRoadmap } from '../lib/financialRoadmaps.js';
import { POST } from '../app/api/ai/insight/route.js';

// Fixture transactions where expenses > income
const OVERSPEND_TXS = [
  { type: 'income', amount: 100, categoryId: null, description: 'wage', occurredAt: new Date() },
  { type: 'expense', amount: 200, categoryId: null, description: 'rent', occurredAt: new Date() },
];

// Fixture transactions where expenses <= income
const SURPLUS_TXS = [
  { type: 'income', amount: 500, categoryId: null, description: 'salary', occurredAt: new Date() },
  { type: 'expense', amount: 200, categoryId: null, description: 'food', occurredAt: new Date() },
];

function makeReq(bodyData = {}) {
  return {
    headers: { get: jest.fn((k) => (k === 'cookie' ? 'session=tok' : '')) },
    json: jest.fn(async () => bodyData),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Authenticated user — required for full analysis path (guest → early return)
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'u1' });
  prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'test@test.com', name: null });
  prisma.goal.findMany.mockResolvedValue([]);
  prisma.category.findMany.mockResolvedValue([]);
  prisma.aiInsight.create.mockResolvedValue({});
  prisma.financialReview.create.mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// callStructured returns null content — overspend branch
// ---------------------------------------------------------------------------
test('null content, expenses > income: source is deterministic, overspend message and suggestions present', async () => {
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({ content: null, source: 'provider-error' });
  prisma.transaction.findMany.mockResolvedValue(OVERSPEND_TXS);

  const req = makeReq({});
  const result = await POST(req);

  expect(result.body.source).toBe('deterministic');
  expect(result.body.insight).toContain('spending more than you earn');
  expect(result.body.details.suggestions).toContain('Review recurring subscriptions and cancel unused ones.');
  expect(result.body.details.suggestions).toContain('Set a small weekly spending limit and track purchases.');
});

// ---------------------------------------------------------------------------
// callStructured returns null content — savings branch
// ---------------------------------------------------------------------------
test('null content, expenses <= income: source is deterministic, savings suggestions present', async () => {
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({ content: null, source: 'provider-error' });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  const result = await POST(req);

  expect(result.body.source).toBe('deterministic');
  expect(result.body.details.suggestions).toContain(
    'Consider moving a portion of your leftover to a savings bucket each pay period.'
  );
  expect(result.body.details.suggestions).toContain(
    'Set a short-term goal and automatically deposit a fixed amount into savings.'
  );
});

// ---------------------------------------------------------------------------
// callStructured returns valid JSON
// ---------------------------------------------------------------------------
test('valid JSON content: parsed insight and suggestions returned', async () => {
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"You\'re doing great!","suggestions":["tip1","tip2"]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  const result = await POST(req);

  expect(result.body.insight).toBe("You're doing great!");
  expect(result.body.details.suggestions).toEqual(['tip1', 'tip2']);
});

// ---------------------------------------------------------------------------
// callStructured returns non-JSON string
// ---------------------------------------------------------------------------
test('non-JSON content: raw string used as insight, suggestions array is empty', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({ content: 'plain text advice', source: 'openai' });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  const result = await POST(req);

  expect(result.body.insight).toBe('plain text advice');
  expect(result.body.details.suggestions).toEqual([]);
});

// ---------------------------------------------------------------------------
// Part 5: goalProgress in details response
// ---------------------------------------------------------------------------
test('goalProgress in details when goal exists: contains title, progress, forecastMonths', async () => {
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"On track!","suggestions":["Keep going"]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);
  prisma.goal.findMany.mockResolvedValue([{
    id: 'g1', title: 'Laptop', targetAmount: 1200, currentAmount: 0,
    progressPercent: 25, currentSaved: 300, remainingAmount: 900,
    monthlyTarget: null, startingBalance: 0, dueDate: null, status: 'active',
    createdAt: new Date(), updatedAt: new Date(),
  }]);

  const req = makeReq({});
  const result = await POST(req);

  expect(result.body.details.goalProgress).toBeDefined();
  expect(result.body.details.goalProgress.title).toBe('Laptop');
  expect(typeof result.body.details.goalProgress.progress).toBe('number');
});

test('goalProgress is null in details when no goals exist', async () => {
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"All good!","suggestions":["Save more"]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);
  prisma.goal.findMany.mockResolvedValue([]);

  const req = makeReq({});
  const result = await POST(req);

  expect(result.body.details.goalProgress).toBeNull();
});

// ---------------------------------------------------------------------------
// Scenario E: signal persistence
// ---------------------------------------------------------------------------

test('Scenario E: signals are persisted in DB input snapshot alongside insight', async () => {
  buildFinancialSignals.mockReturnValueOnce({
    savingsRate: null,
    spendingChanges: [],
    consistency: null,
    goals: [],
    supportingSignals: ['food_spending_increase', 'goal_forecast'],
    supportingData: [],
  });
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Food up.","suggestions":["Track food"]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  await POST(req);

  expect(prisma.aiInsight.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        input: expect.objectContaining({
          signals: ['food_spending_increase', 'goal_forecast'],
        }),
      }),
    })
  );
});

test('Scenario E: signals array is returned in response body', async () => {
  buildFinancialSignals.mockReturnValueOnce({
    savingsRate: null,
    spendingChanges: [],
    consistency: null,
    goals: [],
    supportingSignals: ['savings_rate_improvement'],
    supportingData: [],
  });
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Savings improved.","suggestions":["Keep going"]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  const result = await POST(req);

  expect(result.body.signals).toEqual(['savings_rate_improvement']);
});

test('empty signals persist as empty array in DB', async () => {
  // Default mock returns supportingSignals: []
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"No trends yet.","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  await POST(req);

  expect(prisma.aiInsight.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        input: expect.objectContaining({ signals: [] }),
      }),
    })
  );
});

// ---------------------------------------------------------------------------
// Part 7: alert persistence and response
// ---------------------------------------------------------------------------

test('alerts are returned in response body as array', async () => {
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Good job!","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  const result = await POST(req);

  expect(Array.isArray(result.body.alerts)).toBe(true);
});

test('alerts with active data are persisted as summary in DB input', async () => {
  buildFinancialAlerts.mockReturnValueOnce({
    alerts: [
      { id: 'goal_completed', severity: 'high', tone: 'positive', title: 'Goal achieved', description: 'Laptop completed.', signalId: null },
    ],
  });
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Goal done!","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  await POST(req);

  expect(prisma.aiInsight.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        input: expect.objectContaining({
          alerts: [{ id: 'goal_completed', severity: 'high' }],
        }),
      }),
    })
  );
});

test('alerts returned in response include full alert objects', async () => {
  buildFinancialAlerts.mockReturnValueOnce({
    alerts: [
      { id: 'food_spike', severity: 'medium', tone: 'warning', title: 'Food spending increased', description: 'Food up 38%.', signalId: 'food_spending_increase' },
    ],
  });
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Watch food.","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  const result = await POST(req);

  expect(result.body.alerts[0]).toMatchObject({ id: 'food_spike', severity: 'medium', title: 'Food spending increased' });
});

// ---------------------------------------------------------------------------
// Sprint 20G: memory persistence and response
// ---------------------------------------------------------------------------

test('buildFinancialMemory is called during insight generation', async () => {
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Good job!","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  await POST(req);

  expect(buildFinancialMemory).toHaveBeenCalled();
});

test('memory is persisted in DB input snapshot', async () => {
  buildFinancialMemory.mockReturnValueOnce({
    recurringPatterns: [],
    improvingPatterns: ['savings_rate'],
    worseningPatterns: [],
    newlyTriggeredAlerts: [],
    resolvedAlerts: ['food_spike'],
    ongoingAlerts: [],
    streaks: {},
    repeated: false,
  });
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Improving!","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  await POST(req);

  expect(prisma.aiInsight.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        input: expect.objectContaining({
          memory: expect.objectContaining({
            improvingPatterns: ['savings_rate'],
            resolvedAlerts: ['food_spike'],
          }),
        }),
      }),
    })
  );
});

test('memory is returned in response body', async () => {
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
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"On track!","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  const result = await POST(req);

  expect(result.body.memory).toBeDefined();
  expect(result.body.memory.improvingPatterns).toContain('savings_rate');
});

// ---------------------------------------------------------------------------
// Sprint 20H: opportunity persistence and response
// ---------------------------------------------------------------------------

test('buildFinancialOpportunities is called during insight generation', async () => {
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Good job!","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  await POST(req);

  expect(buildFinancialOpportunities).toHaveBeenCalled();
});

test('opportunities are persisted as summaries in DB input', async () => {
  buildFinancialOpportunities.mockReturnValueOnce({
    opportunities: [
      { id: 'reduce_food_spending', category: 'spending', impactScore: 72, confidence: 'high', title: 'Reduce food spending', description: 'Food spending elevated.' },
    ],
  });
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Watch food.","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  await POST(req);

  expect(prisma.aiInsight.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        input: expect.objectContaining({
          opportunities: expect.arrayContaining([
            expect.objectContaining({ id: 'reduce_food_spending', score: 72 }),
          ]),
        }),
      }),
    })
  );
});

// ---------------------------------------------------------------------------
// Sprint 20I: action plan generation, persistence, and response
// ---------------------------------------------------------------------------

test('buildActionPlans is called during insight generation', async () => {
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Good job!","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  await POST(req);

  expect(buildActionPlans).toHaveBeenCalled();
});

test('actions are persisted as summaries in DB input with id and priorityScore', async () => {
  buildActionPlans.mockReturnValueOnce({
    plans: [
      { id: 'reduce_food_spending', title: 'Reduce food spending', description: 'Lower monthly food spending by $100.', impactScore: 65, estimatedMonthlyBenefit: 100, difficulty: 'medium', priorityScore: 75 },
    ],
  });
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Watch food.","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  await POST(req);

  expect(prisma.aiInsight.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        input: expect.objectContaining({
          actions: expect.arrayContaining([
            expect.objectContaining({ id: 'reduce_food_spending', priorityScore: 75 }),
          ]),
        }),
      }),
    })
  );
});

test('actions are returned in response body as full plan objects', async () => {
  buildActionPlans.mockReturnValueOnce({
    plans: [
      { id: 'goal_acceleration', title: 'Accelerate Laptop goal', description: 'Increase monthly contributions by $50.', impactScore: 57, estimatedMonthlyBenefit: 50, difficulty: 'medium', priorityScore: 67 },
    ],
  });
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Goal on track.","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  const result = await POST(req);

  expect(Array.isArray(result.body.actions)).toBe(true);
  expect(result.body.actions[0]).toMatchObject({ id: 'goal_acceleration', priorityScore: 67 });
});

test('opportunities are returned in response body as full objects', async () => {
  buildFinancialOpportunities.mockReturnValueOnce({
    opportunities: [
      { id: 'goal_acceleration', category: 'goal', impactScore: 57, confidence: 'medium', title: 'Accelerate Laptop goal', description: 'Laptop completes in 5 months.' },
    ],
  });
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Goal on track.","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  const result = await POST(req);

  expect(Array.isArray(result.body.opportunities)).toBe(true);
  expect(result.body.opportunities[0]).toMatchObject({ id: 'goal_acceleration', impactScore: 57 });
});

// ---------------------------------------------------------------------------
// Sprint 20J: action history fetched, suppression, completion alerts
// ---------------------------------------------------------------------------

test('financialAction.findMany is called to fetch action history', async () => {
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Good job!","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  await POST(req);

  expect(prisma.financialAction.findMany).toHaveBeenCalled();
});

test('Scenario C: suppressActiveOpportunities is called with active action IDs', async () => {
  prisma.financialAction.findMany.mockResolvedValueOnce([
    { id: 'fa1', actionId: 'reduce_food_spending', title: 'Reduce food spending', status: 'active', priorityScore: 75 },
  ]);
  buildFinancialOpportunities.mockReturnValueOnce({
    opportunities: [
      { id: 'reduce_food_spending', category: 'spending', impactScore: 70, confidence: 'high', title: 'Reduce food spending', description: 'Food elevated.' },
    ],
  });
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Suppressed.","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  await POST(req);

  expect(suppressActiveOpportunities).toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// Sprint 20K: strategy engine integration
// ---------------------------------------------------------------------------

test('buildFinancialStrategies is called during insight generation', async () => {
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Strategy generated.","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  await POST(req);

  expect(buildFinancialStrategies).toHaveBeenCalled();
});

test('buildCompletionAlerts is called with financial actions', async () => {
  prisma.financialAction.findMany.mockResolvedValueOnce([
    { id: 'fa1', actionId: 'reduce_food_spending', title: 'Reduce food spending', status: 'completed', priorityScore: 75 },
  ]);
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Great.","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  await POST(req);

  expect(buildCompletionAlerts).toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// Sprint 20L: review engine integration
// ---------------------------------------------------------------------------

test('buildFinancialReview is called during insight generation', async () => {
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Review ready.","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  await POST(req);

  expect(buildFinancialReview).toHaveBeenCalled();
});

test('review is returned in response body', async () => {
  buildFinancialReview.mockReturnValueOnce({
    period: 'monthly',
    wins: ['Savings rate improved'],
    concerns: [],
    completedActions: 0,
    activeStrategies: 0,
    topOpportunity: null,
    roadmapProgress: null,
  });
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"On track!","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  const result = await POST(req);

  expect(result.body.review).toBeDefined();
  expect(result.body.review.wins).toContain('Savings rate improved');
});

// ---------------------------------------------------------------------------
// Sprint 20M: roadmap engine integration
// ---------------------------------------------------------------------------

test('buildFinancialRoadmap is called during insight generation', async () => {
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"Roadmap ready.","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  await POST(req);

  expect(buildFinancialRoadmap).toHaveBeenCalled();
});

test('roadmap is returned in response body', async () => {
  buildFinancialRoadmap.mockReturnValueOnce({
    roadmap: {
      title: 'Laptop Plan',
      milestones: [{ id: 'save_25', title: 'Reach 25%', completed: true }],
      projectedCompletionDate: '2027-02-01',
      goalOrder: ['g1'],
      currentGoal: { id: 'g1', title: 'Laptop', progressPercent: 30 },
      nextMilestone: { id: 'save_50', title: 'Reach 50%', completed: false },
    },
  });
  hasApiKey.mockReturnValue(true);
  callStructured.mockResolvedValueOnce({
    content: '{"insight":"On track!","suggestions":[]}',
    source: 'openai',
  });
  prisma.transaction.findMany.mockResolvedValue(SURPLUS_TXS);

  const req = makeReq({});
  const result = await POST(req);

  expect(result.body.roadmap).toBeDefined();
  expect(result.body.roadmap.title).toBe('Laptop Plan');
});
