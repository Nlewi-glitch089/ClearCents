// Tests for PATCH /api/goals/[id]

jest.mock('../lib/prisma.js', () => ({
  user: { findUnique: jest.fn() },
  goal: { findUnique: jest.fn(), update: jest.fn() },
  transaction: { findMany: jest.fn(async () => []) },
}));

jest.mock('../lib/auth.js', () => ({
  parseCookies: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('../lib/goals.js', () => ({
  computeGoalProgress: jest.fn((goals) => goals.map(g => ({
    ...g,
    currentSaved: 200,
    progressPercent: 40,
    remainingAmount: 300,
    goalAgeMonths: 1,
    monthlyPaceActual: 200,
    monthsRemaining: null,
    requiredMonthlyToHitTarget: null,
    isOnTrack: null,
  }))),
}));

jest.mock('../lib/ai.js', () => ({
  syncOnboardingGoalTitle: jest.fn(async () => {}),
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

jest.mock('next/server', () => ({
  NextResponse: { json: jest.fn((body, init) => ({ body, status: init?.status || 200 })) },
}));

import prisma from '../lib/prisma.js';
import { parseCookies, verifyToken } from '../lib/auth.js';
import { syncOnboardingGoalTitle } from '../lib/ai.js';
import { computeGoalProgress } from '../lib/goals.js';
import { PATCH } from '../app/api/goals/[id]/route.js';

const MOCK_USER = { id: 'user-1', email: 'test@example.com' };
const MOCK_GOAL = {
  id: 'goal-1', userId: 'user-1', title: 'Laptop',
  targetAmount: 1200, currentAmount: 0, monthlyTarget: null,
  startingBalance: 0, dueDate: null, status: 'active',
  createdAt: new Date(), updatedAt: new Date(),
};

function makeReq(bodyData = {}) {
  return {
    headers: { get: jest.fn((k) => (k === 'cookie' ? 'session=tok' : '')) },
    json: jest.fn(async () => bodyData),
  };
}

function makeParams(id = 'goal-1') {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);
  prisma.goal.findUnique.mockResolvedValue(MOCK_GOAL);
  prisma.goal.update.mockResolvedValue(MOCK_GOAL);
});

// ---------------------------------------------------------------------------
// Auth & ownership guards
// ---------------------------------------------------------------------------

test('PATCH: unauthenticated returns 401', async () => {
  parseCookies.mockReturnValue({});
  const result = await PATCH(makeReq({ title: 'New' }), makeParams());
  expect(result.status).toBe(401);
});

test('PATCH: goal not found returns 404', async () => {
  prisma.goal.findUnique.mockResolvedValue(null);
  const result = await PATCH(makeReq({ title: 'New' }), makeParams());
  expect(result.status).toBe(404);
});

test('PATCH: another user\'s goal returns 404 without calling update', async () => {
  prisma.goal.findUnique.mockResolvedValue({ ...MOCK_GOAL, userId: 'user-2' });
  const result = await PATCH(makeReq({ title: 'New' }), makeParams());
  expect(result.status).toBe(404);
  expect(prisma.goal.update).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// Successful update
// ---------------------------------------------------------------------------

test('PATCH: updates title and returns enriched goal', async () => {
  const updated = { ...MOCK_GOAL, title: 'MacBook Pro' };
  prisma.goal.update.mockResolvedValue(updated);

  const result = await PATCH(makeReq({ title: 'MacBook Pro' }), makeParams());

  expect(result.status).toBe(200);
  expect(result.body.goal.title).toBe('MacBook Pro');
  expect(result.body.goal.currentSaved).toBe(200);
  expect(result.body.goal.currentAmount).toBe(0);
});

test('PATCH: update payload only includes provided fields', async () => {
  await PATCH(makeReq({ targetAmount: 1500 }), makeParams());
  const updateData = prisma.goal.update.mock.calls[0][0].data;
  expect(updateData).toHaveProperty('targetAmount', 1500);
  expect(updateData).not.toHaveProperty('title');
  expect(updateData).not.toHaveProperty('dueDate');
  expect(updateData).not.toHaveProperty('startingBalance');
});

test('PATCH: null dueDate is stored as null (not omitted)', async () => {
  await PATCH(makeReq({ dueDate: null }), makeParams());
  const updateData = prisma.goal.update.mock.calls[0][0].data;
  expect(updateData).toHaveProperty('dueDate', null);
});

test('PATCH: status update archives the goal', async () => {
  const archived = { ...MOCK_GOAL, status: 'archived' };
  prisma.goal.update.mockResolvedValue(archived);
  const result = await PATCH(makeReq({ status: 'archived' }), makeParams());
  expect(result.status).toBe(200);
  expect(prisma.goal.update.mock.calls[0][0].data).toHaveProperty('status', 'archived');
});

// ---------------------------------------------------------------------------
// Scenario C: Goal rename syncs onboarding (Part 4)
// ---------------------------------------------------------------------------

test('PATCH: title change triggers syncOnboardingGoalTitle with new title', async () => {
  const updated = { ...MOCK_GOAL, title: 'MacBook Pro' };
  prisma.goal.update.mockResolvedValue(updated);

  await PATCH(makeReq({ title: 'MacBook Pro' }), makeParams());

  expect(syncOnboardingGoalTitle).toHaveBeenCalledTimes(1);
  expect(syncOnboardingGoalTitle).toHaveBeenCalledWith('user-1', 'MacBook Pro');
});

test('PATCH: non-title update does NOT trigger syncOnboardingGoalTitle', async () => {
  await PATCH(makeReq({ targetAmount: 1500 }), makeParams());
  expect(syncOnboardingGoalTitle).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// Scenario D: PATCH auto-completion when target is reached
// ---------------------------------------------------------------------------

test('PATCH: auto-completes goal when progressPercent reaches 100', async () => {
  // Make computeGoalProgress return 100% for this test
  computeGoalProgress.mockReturnValueOnce([{
    ...MOCK_GOAL,
    currentSaved: 1200,
    progressPercent: 100,
    remainingAmount: 0,
    goalAgeMonths: 2,
    monthlyPaceActual: 600,
    monthsRemaining: null,
    requiredMonthlyToHitTarget: null,
    isOnTrack: true,
  }]);

  const result = await PATCH(makeReq({ targetAmount: 1200 }), makeParams());

  expect(result.status).toBe(200);
  // Second call to goal.update is for auto-completion (first is the PATCH itself)
  const updateCalls = prisma.goal.update.mock.calls;
  const completionCall = updateCalls.find(c => c[0].data?.status === 'completed');
  expect(completionCall).toBeDefined();
  expect(completionCall[0].data).toHaveProperty('completedAt');
  expect(result.body.goal.justCompleted).toBe(true);
});

test('PATCH: goal below 100% is NOT auto-completed', async () => {
  // Default mock returns progressPercent:40
  const result = await PATCH(makeReq({ targetAmount: 900 }), makeParams());

  expect(result.status).toBe(200);
  // Only one update call (the PATCH), not the auto-completion call
  expect(prisma.goal.update).toHaveBeenCalledTimes(1);
  expect(result.body.goal.justCompleted).toBe(false);
});
