// Tests for POST /api/onboarding
// Focus: goal upsert behavior, especially dueDate preservation (BUG-2 fix).

const EXISTING_GOAL = {
  id: 'goal-1',
  userId: 'user-1',
  title: 'Laptop Fund',
  targetAmount: 500,
  monthlyTarget: 100,
  startingBalance: 50,
  dueDate: new Date('2026-12-14T00:00:00Z'),
  status: 'active',
  createdAt: new Date('2026-06-01T00:00:00Z'),
  updatedAt: new Date('2026-06-01T00:00:00Z'),
};

const MOCK_USER = { id: 'user-1', email: 'test@example.com' };

// Prisma mock — $transaction executes its callback immediately with the same mock client
const mockTx = {
  goal: {
    findFirst: jest.fn(),
    update:    jest.fn(),
    create:    jest.fn(),
  },
  transaction: { findMany: jest.fn(async () => []) },
};

jest.mock('../lib/prisma.js', () => {
  const mock = {
    user:      { findUnique: jest.fn() },
    aiInsight: { create: jest.fn(async () => ({})) },
    goal:      { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    transaction: { findMany: jest.fn(async () => []) },
    $transaction: jest.fn(async (cb) => cb(mockTx)),
  };
  return { default: mock, __esModule: true };
});

jest.mock('../lib/auth.js', () => ({
  parseCookies: jest.fn(),
  verifyToken:  jest.fn(),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      body,
      status: init?.status || 200,
      headers: { append: jest.fn() },
    })),
  },
}));

import prisma from '../lib/prisma.js';
import { parseCookies, verifyToken } from '../lib/auth.js';
import { POST } from '../app/api/onboarding/route.js';

function makeReq(bodyData = {}, cookieHeader = 'session=tok') {
  return {
    headers: { get: jest.fn((k) => (k === 'cookie' ? cookieHeader : '')) },
    json: jest.fn(async () => bodyData),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);
  prisma.aiInsight.create.mockResolvedValue({});
  prisma.transaction.findMany.mockResolvedValue([]);
  mockTx.goal.findFirst.mockResolvedValue(null);
  mockTx.goal.update.mockResolvedValue(EXISTING_GOAL);
  mockTx.goal.create.mockResolvedValue(EXISTING_GOAL);
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
test('POST: unauthenticated returns 401', async () => {
  parseCookies.mockReturnValue({});
  const req = makeReq({ goal: 'Save $500' }, '');
  const result = await POST(req);
  expect(result.status).toBe(401);
});

// ---------------------------------------------------------------------------
// AiInsight always written
// ---------------------------------------------------------------------------
test('POST: AiInsight is always created before goal upsert', async () => {
  const req = makeReq({ goal: 'Save $500', monthly: '100', timeframe: '6 months' });
  await POST(req);
  expect(prisma.aiInsight.create).toHaveBeenCalledTimes(1);
  expect(prisma.aiInsight.create.mock.calls[0][0].data.input).toMatchObject({
    goal: 'Save $500',
    monthly: '100',
    timeframe: '6 months',
    type: 'onboarding',
  });
});

// ---------------------------------------------------------------------------
// New goal creation
// ---------------------------------------------------------------------------
test('POST: creates goal when no active goal exists', async () => {
  mockTx.goal.findFirst.mockResolvedValue(null);
  const req = makeReq({ goal: 'Save $500', monthly: '100', timeframe: '6 months' });
  await POST(req);
  expect(mockTx.goal.create).toHaveBeenCalledTimes(1);
  expect(mockTx.goal.update).not.toHaveBeenCalled();
});

test('POST: new goal creation sets dueDate when timeframe provided', async () => {
  mockTx.goal.findFirst.mockResolvedValue(null);
  const req = makeReq({ goal: 'Save $500', monthly: '100', timeframe: '6 months' });
  await POST(req);
  const created = mockTx.goal.create.mock.calls[0][0].data;
  expect(created.dueDate).not.toBeNull();
});

test('POST: new goal creation sets dueDate to null when timeframe absent', async () => {
  mockTx.goal.findFirst.mockResolvedValue(null);
  const req = makeReq({ goal: 'Save $500' }); // no timeframe
  await POST(req);
  const created = mockTx.goal.create.mock.calls[0][0].data;
  expect(created.dueDate).toBeNull();
});

// ---------------------------------------------------------------------------
// BUG-2 fix: dueDate preservation on edit
// ---------------------------------------------------------------------------
test('POST: editing goal with timeframe updates dueDate', async () => {
  mockTx.goal.findFirst.mockResolvedValue(EXISTING_GOAL);
  const req = makeReq({ goal: 'Save $500', monthly: '100', timeframe: '1 year' });
  await POST(req);
  expect(mockTx.goal.update).toHaveBeenCalledTimes(1);
  const updateData = mockTx.goal.update.mock.calls[0][0].data;
  expect(updateData).toHaveProperty('dueDate');
  expect(updateData.dueDate).not.toBeNull();
});

test('POST: editing goal WITHOUT timeframe does NOT include dueDate in update (preserves existing)', async () => {
  mockTx.goal.findFirst.mockResolvedValue(EXISTING_GOAL);
  // Simulates app/auth/edit/page.js — sends only { goal, monthly }, no timeframe
  const req = makeReq({ goal: 'Save $500', monthly: '150' });
  await POST(req);
  expect(mockTx.goal.update).toHaveBeenCalledTimes(1);
  const updateData = mockTx.goal.update.mock.calls[0][0].data;
  // dueDate must NOT appear in the update payload at all
  expect(updateData).not.toHaveProperty('dueDate');
});

test('POST: editing goal with empty-string timeframe does NOT include dueDate in update', async () => {
  mockTx.goal.findFirst.mockResolvedValue(EXISTING_GOAL);
  // Simulates user leaving the timeframe <select> on its blank option
  const req = makeReq({ goal: 'Save $500', monthly: '100', timeframe: '' });
  await POST(req);
  const updateData = mockTx.goal.update.mock.calls[0][0].data;
  expect(updateData).not.toHaveProperty('dueDate');
});

test('POST: editing goal with null timeframe does NOT include dueDate in update', async () => {
  mockTx.goal.findFirst.mockResolvedValue(EXISTING_GOAL);
  const req = makeReq({ goal: 'Save $500', monthly: '100', timeframe: null });
  await POST(req);
  const updateData = mockTx.goal.update.mock.calls[0][0].data;
  expect(updateData).not.toHaveProperty('dueDate');
});

// ---------------------------------------------------------------------------
// startingBalance immutability on edit
// ---------------------------------------------------------------------------
test('POST: editing goal never updates startingBalance', async () => {
  mockTx.goal.findFirst.mockResolvedValue(EXISTING_GOAL);
  const req = makeReq({ goal: 'Save $500', monthly: '100', timeframe: '1 year' });
  await POST(req);
  const updateData = mockTx.goal.update.mock.calls[0][0].data;
  expect(updateData).not.toHaveProperty('startingBalance');
});

// ---------------------------------------------------------------------------
// onboarding still succeeds even when goal upsert throws
// ---------------------------------------------------------------------------
test('POST: goal upsert failure does not block onboarding success', async () => {
  prisma.$transaction.mockRejectedValueOnce(new Error('DB error'));
  const req = makeReq({ goal: 'Save $500', monthly: '100' });
  const result = await POST(req);
  // onboarding response is success regardless
  expect(result.status).toBe(200);
  expect(result.body.success).toBe(true);
  // AiInsight was still written
  expect(prisma.aiInsight.create).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------------------
// BUG-1 fix: non-numeric goal text must not create a $0 Goal record
// ---------------------------------------------------------------------------
test('POST: non-numeric goal text → AiInsight saved, no Goal created, 200', async () => {
  mockTx.goal.findFirst.mockResolvedValue(null);
  const req = makeReq({ goal: 'Build better financial habits', monthly: '50' });
  const result = await POST(req);
  expect(result.status).toBe(200);
  expect(result.body.success).toBe(true);
  expect(prisma.aiInsight.create).toHaveBeenCalledTimes(1);
  expect(mockTx.goal.create).not.toHaveBeenCalled();
});

test('POST: vague goal text → no Goal created', async () => {
  mockTx.goal.findFirst.mockResolvedValue(null);
  const req = makeReq({ goal: 'Stop living paycheck to paycheck' });
  const result = await POST(req);
  expect(result.status).toBe(200);
  expect(mockTx.goal.create).not.toHaveBeenCalled();
});

test('POST: empty goal text → no Goal created', async () => {
  mockTx.goal.findFirst.mockResolvedValue(null);
  const req = makeReq({ goal: '' });
  const result = await POST(req);
  expect(result.status).toBe(200);
  expect(mockTx.goal.create).not.toHaveBeenCalled();
});

test('POST: numeric goal text → Goal IS created with correct targetAmount', async () => {
  mockTx.goal.findFirst.mockResolvedValue(null);
  const req = makeReq({ goal: 'Save $500', monthly: '100', timeframe: '1 year' });
  await POST(req);
  expect(mockTx.goal.create).toHaveBeenCalledTimes(1);
  const created = mockTx.goal.create.mock.calls[0][0].data;
  expect(created.targetAmount).toBe(500);
});

// ---------------------------------------------------------------------------
// BUG-3 fix: monthlyTarget preservation when monthly is omitted or cleared
// ---------------------------------------------------------------------------
test('POST: editing goal WITHOUT monthly → monthlyTarget NOT in updateData (preserved)', async () => {
  mockTx.goal.findFirst.mockResolvedValue(EXISTING_GOAL);
  // Simulates an API caller that omits monthly entirely (e.g. a future endpoint
  // that only updates the goal title). monthlyTarget must not be touched.
  const req = makeReq({ goal: 'Save $500', timeframe: '1 year' });
  await POST(req);
  expect(mockTx.goal.update).toHaveBeenCalledTimes(1);
  const updateData = mockTx.goal.update.mock.calls[0][0].data;
  expect(updateData).not.toHaveProperty('monthlyTarget');
});

test('POST: editing goal with monthly "" → monthlyTarget explicitly cleared to null', async () => {
  mockTx.goal.findFirst.mockResolvedValue(EXISTING_GOAL);
  // Simulates user clearing the monthly field and saving. Deliberate removal.
  const req = makeReq({ goal: 'Save $500', monthly: '' });
  await POST(req);
  expect(mockTx.goal.update).toHaveBeenCalledTimes(1);
  const updateData = mockTx.goal.update.mock.calls[0][0].data;
  expect(updateData).toHaveProperty('monthlyTarget', null);
});

test('POST: editing goal with monthly null → monthlyTarget cleared to null', async () => {
  mockTx.goal.findFirst.mockResolvedValue(EXISTING_GOAL);
  const req = makeReq({ goal: 'Save $500', monthly: null });
  await POST(req);
  expect(mockTx.goal.update).toHaveBeenCalledTimes(1);
  const updateData = mockTx.goal.update.mock.calls[0][0].data;
  expect(updateData).toHaveProperty('monthlyTarget', null);
});

test('POST: editing goal with numeric monthly → monthlyTarget updated to new value', async () => {
  mockTx.goal.findFirst.mockResolvedValue(EXISTING_GOAL);
  const req = makeReq({ goal: 'Save $500', monthly: '200' });
  await POST(req);
  expect(mockTx.goal.update).toHaveBeenCalledTimes(1);
  const updateData = mockTx.goal.update.mock.calls[0][0].data;
  expect(updateData).toHaveProperty('monthlyTarget', 200);
});
