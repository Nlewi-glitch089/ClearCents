jest.mock('../lib/prisma.js', () => ({
  user: { findUnique: jest.fn() },
  goal: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(async () => null), create: jest.fn(), update: jest.fn() },
  transaction: { findMany: jest.fn(async () => []) },
  aiInsight: { findFirst: jest.fn(), findMany: jest.fn(async () => []) },
}));

jest.mock('../lib/auth.js', () => ({
  parseCookies: jest.fn(),
  verifyToken: jest.fn(),
}));

// computeGoalProgress is tested in lib-goals.test.js; here we keep it simple
jest.mock('../lib/goals.js', () => ({
  computeGoalProgress: jest.fn((goals) => goals.map(g => ({
    ...g,
    currentSaved: 150,
    progressPercent: 30,
    remainingAmount: 350,
    goalAgeMonths: 1.5,
    monthlyPaceActual: 100,
    monthsRemaining: null,
    requiredMonthlyToHitTarget: null,
    isOnTrack: true,
  }))),
  parseTargetAmount: jest.fn(() => 0),
}));

jest.mock('../lib/ai.js', () => ({
  getOnboardingData: jest.fn(async () => null),
}));

jest.mock('next/server', () => ({
  NextResponse: { json: jest.fn((body, init) => ({ body, status: init?.status || 200 })) },
}));

import prisma from '../lib/prisma.js';
import { parseCookies, verifyToken } from '../lib/auth.js';
import { getOnboardingData } from '../lib/ai.js';
import { parseTargetAmount, computeGoalProgress } from '../lib/goals.js';
import { GET, POST } from '../app/api/goals/route.js';

function makeReq(bodyData = {}, cookieHeader = '') {
  return {
    headers: { get: jest.fn((k) => (k === 'cookie' ? cookieHeader : '')) },
    json: jest.fn(async () => bodyData),
  };
}

const MOCK_USER = { id: 'user-1', email: 'test@example.com' };
const MOCK_GOAL = {
  id: 'goal-1', userId: 'user-1', title: 'Laptop Fund',
  targetAmount: 500, currentAmount: 0, monthlyTarget: 100,
  startingBalance: 50, dueDate: null, status: 'active',
  createdAt: new Date(), updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  parseCookies.mockReturnValue({});
  prisma.user.findUnique.mockResolvedValue(null);
  prisma.goal.findMany.mockResolvedValue([]);
  prisma.goal.create.mockResolvedValue(MOCK_GOAL);
  prisma.goal.update.mockResolvedValue(MOCK_GOAL);
  prisma.transaction.findMany.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// GET /api/goals
// ---------------------------------------------------------------------------

test('GET: unauthenticated returns 401', async () => {
  const req = makeReq({});
  const result = await GET(req);
  expect(result.status).toBe(401);
});

test('GET: authenticated user with no goals returns empty array', async () => {
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);
  prisma.goal.findMany.mockResolvedValue([]);

  const req = makeReq({}, 'session=tok');
  const result = await GET(req);

  expect(result.status).toBe(200);
  expect(result.body.goals).toEqual([]);
});

test('GET: returns enriched goal with currentAmount:0 for compat', async () => {
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);
  prisma.goal.findMany.mockResolvedValue([MOCK_GOAL]);
  prisma.transaction.findMany.mockResolvedValue([
    { type: 'income', amount: 300 },
    { type: 'expense', amount: 100 },
  ]);

  const req = makeReq({}, 'session=tok');
  const result = await GET(req);

  expect(result.status).toBe(200);
  expect(result.body.goals).toHaveLength(1);
  // computeGoalProgress mock adds currentSaved etc.
  expect(result.body.goals[0].currentSaved).toBe(150);
  expect(result.body.goals[0].progressPercent).toBe(30);
  // API compatibility field
  expect(result.body.goals[0].currentAmount).toBe(0);
});

// ---------------------------------------------------------------------------
// GET lazy backfill — BUG-1 guard
// ---------------------------------------------------------------------------

test('GET: backfill skipped when onboarding goal text is non-numeric (BUG-1)', async () => {
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);
  prisma.goal.findMany.mockResolvedValue([]);
  // parseTargetAmount mock defaults to 0 → non-numeric goal
  getOnboardingData.mockResolvedValueOnce({ goal: 'Build better financial habits', monthly: '50' });

  const req = makeReq({}, 'session=tok');
  const result = await GET(req);

  expect(result.status).toBe(200);
  expect(result.body.goals).toEqual([]);
  expect(prisma.goal.create).not.toHaveBeenCalled();
});

test('GET: backfill creates goal when onboarding has a numeric target', async () => {
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);
  prisma.goal.findMany.mockResolvedValue([]);
  parseTargetAmount.mockReturnValueOnce(500);
  getOnboardingData.mockResolvedValueOnce({ goal: 'Save $500', monthly: '100' });
  prisma.goal.create.mockResolvedValue(MOCK_GOAL);

  const req = makeReq({}, 'session=tok');
  const result = await GET(req);

  expect(prisma.goal.create).toHaveBeenCalledTimes(1);
  const createArg = prisma.goal.create.mock.calls[0][0].data;
  expect(createArg.targetAmount).toBe(500);
  expect(result.status).toBe(200);
  expect(result.body.goals).toHaveLength(1);
});

test('GET: backfill prefers explicit targetAmount over parseTargetAmount (Sprint 20B wizard)', async () => {
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);
  prisma.goal.findMany.mockResolvedValue([]);
  // parseTargetAmount returns 0 for "Laptop" (non-numeric label)
  parseTargetAmount.mockReturnValueOnce(0);
  getOnboardingData.mockResolvedValueOnce({ goalType: 'Laptop', goal: 'Laptop', targetAmount: 1200 });
  prisma.goal.create.mockResolvedValue({ ...MOCK_GOAL, title: 'Laptop', targetAmount: 1200 });

  const req = makeReq({}, 'session=tok');
  const result = await GET(req);

  expect(prisma.goal.create).toHaveBeenCalledTimes(1);
  const createArg = prisma.goal.create.mock.calls[0][0].data;
  expect(createArg.title).toBe('Laptop');
  expect(createArg.targetAmount).toBe(1200);
  expect(result.status).toBe(200);
});

test('GET: backfill uses goalType for title when both goalType and goal are present', async () => {
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);
  prisma.goal.findMany.mockResolvedValue([]);
  parseTargetAmount.mockReturnValueOnce(0);
  getOnboardingData.mockResolvedValueOnce({ goalType: 'Emergency Fund', goal: 'Emergency Fund', targetAmount: 500 });
  prisma.goal.create.mockResolvedValue({ ...MOCK_GOAL, title: 'Emergency Fund', targetAmount: 500 });

  const req = makeReq({}, 'session=tok');
  await GET(req);

  const createArg = prisma.goal.create.mock.calls[0][0].data;
  expect(createArg.title).toBe('Emergency Fund');
});

// ---------------------------------------------------------------------------
// POST /api/goals
// ---------------------------------------------------------------------------

test('POST: unauthenticated returns 401', async () => {
  const req = makeReq({ title: 'Laptop', targetAmount: 500 });
  const result = await POST(req);
  expect(result.status).toBe(401);
});

test('POST: missing title returns 400', async () => {
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);

  const req = makeReq({ targetAmount: 500 }, 'session=tok');
  const result = await POST(req);
  expect(result.status).toBe(400);
  expect(result.body.error).toMatch(/title/i);
});

test('POST: zero targetAmount returns 400', async () => {
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);

  const req = makeReq({ title: 'Laptop', targetAmount: 0 }, 'session=tok');
  const result = await POST(req);
  expect(result.status).toBe(400);
});

test('POST: valid body creates goal and returns 201 with enriched fields', async () => {
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);
  prisma.transaction.findMany.mockResolvedValue([{ type: 'income', amount: 200 }]);
  prisma.goal.create.mockResolvedValue(MOCK_GOAL);

  const req = makeReq({ title: 'Laptop Fund', targetAmount: 500, monthlyTarget: 100 }, 'session=tok');
  const result = await POST(req);

  expect(result.status).toBe(201);
  expect(result.body.goal.currentSaved).toBe(150); // from mock
  expect(result.body.goal.currentAmount).toBe(0);   // compat field
  expect(prisma.goal.create).toHaveBeenCalledTimes(1);
});

test('POST: startingBalance is computed from transactions at creation time', async () => {
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);
  prisma.transaction.findMany.mockResolvedValue([
    { type: 'income', amount: 500 },
    { type: 'expense', amount: 200 },
  ]);
  prisma.goal.create.mockResolvedValue(MOCK_GOAL);

  const req = makeReq({ title: 'Fund', targetAmount: 100 }, 'session=tok');
  await POST(req);

  // startingBalance should be 500 - 200 = 300
  const createCall = prisma.goal.create.mock.calls[0][0];
  expect(createCall.data.startingBalance).toBe(300);
});

// ---------------------------------------------------------------------------
// BUG-4 fix: one active goal per user
// ---------------------------------------------------------------------------

test('POST: no existing active goal → creates goal and returns 201', async () => {
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);
  prisma.goal.findFirst.mockResolvedValue(null); // no active goal
  prisma.goal.create.mockResolvedValue(MOCK_GOAL);

  const req = makeReq({ title: 'First Goal', targetAmount: 500 }, 'session=tok');
  const result = await POST(req);

  expect(result.status).toBe(201);
  expect(prisma.goal.create).toHaveBeenCalledTimes(1);
});

test('POST: existing active goal → returns 409 Conflict, no create', async () => {
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);
  prisma.goal.findFirst.mockResolvedValue(MOCK_GOAL); // active goal already exists

  const req = makeReq({ title: 'Second Goal', targetAmount: 300 }, 'session=tok');
  const result = await POST(req);

  expect(result.status).toBe(409);
  expect(result.body.error).toMatch(/active goal/i);
  expect(prisma.goal.create).not.toHaveBeenCalled();
});

test('POST: only archived goals exist → creates new active goal, returns 201', async () => {
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);
  // findFirst filters status:'active', so archived goals return null
  prisma.goal.findFirst.mockResolvedValue(null);
  prisma.goal.create.mockResolvedValue(MOCK_GOAL);

  const req = makeReq({ title: 'New Goal', targetAmount: 400 }, 'session=tok');
  const result = await POST(req);

  expect(result.status).toBe(201);
  expect(prisma.goal.create).toHaveBeenCalledTimes(1);
});

test('POST: only completed goals exist → creates new active goal, returns 201', async () => {
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);
  // findFirst filters status:'active', so completed goals return null
  prisma.goal.findFirst.mockResolvedValue(null);
  prisma.goal.create.mockResolvedValue(MOCK_GOAL);

  const req = makeReq({ title: 'New Goal', targetAmount: 600 }, 'session=tok');
  const result = await POST(req);

  expect(result.status).toBe(201);
  expect(prisma.goal.create).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------------------
// GET auto-completion — Scenario D
// ---------------------------------------------------------------------------

test('Scenario D: GET auto-completes active goal at 100% and returns justCompleted:true', async () => {
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);
  prisma.goal.findMany.mockResolvedValue([MOCK_GOAL]);
  prisma.goal.update.mockResolvedValue({ ...MOCK_GOAL, status: 'completed' });
  prisma.transaction.findMany.mockResolvedValue([{ type: 'income', amount: 1000 }]);

  // Override computeGoalProgress to return 100% for this test
  computeGoalProgress.mockReturnValueOnce([{
    ...MOCK_GOAL,
    currentSaved: 500,
    progressPercent: 100,
    remainingAmount: 0,
    goalAgeMonths: 2,
    monthlyPaceActual: 250,
    monthsRemaining: null,
    requiredMonthlyToHitTarget: null,
    isOnTrack: true,
  }]);

  const req = makeReq({}, 'session=tok');
  const result = await GET(req);

  expect(result.status).toBe(200);
  expect(prisma.goal.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) })
  );
  expect(result.body.goals[0].justCompleted).toBe(true);
  expect(result.body.goals[0].status).toBe('completed');
});

test('GET: active goal below 100% is NOT auto-completed', async () => {
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);
  prisma.goal.findMany.mockResolvedValue([MOCK_GOAL]);
  prisma.transaction.findMany.mockResolvedValue([{ type: 'income', amount: 200 }]);
  // Default mock returns progressPercent:30

  const req = makeReq({}, 'session=tok');
  const result = await GET(req);

  expect(prisma.goal.update).not.toHaveBeenCalled();
  expect(result.body.goals[0].justCompleted).toBe(false);
});
