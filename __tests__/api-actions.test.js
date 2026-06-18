jest.mock('../lib/prisma.js', () => ({
  user: { findUnique: jest.fn() },
  financialAction: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../lib/auth.js', () => ({
  parseCookies: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('next/server', () => ({
  NextResponse: { json: jest.fn((body, init) => ({ body, status: init?.status ?? 200 })) },
}));

import prisma from '../lib/prisma.js';
import { parseCookies, verifyToken } from '../lib/auth.js';
import { GET, POST } from '../app/api/actions/route.js';

function makeReq(bodyData = {}, cookieHeader = 'session=tok') {
  return {
    headers: { get: jest.fn((k) => (k === 'cookie' ? cookieHeader : '')) },
    json: jest.fn(async () => bodyData),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'u1' });
  prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'test@test.com' });
});

// ---------------------------------------------------------------------------
// GET /api/actions
// ---------------------------------------------------------------------------

test('GET returns actions for authenticated user', async () => {
  prisma.financialAction.findMany.mockResolvedValue([
    { id: 'fa1', actionId: 'reduce_food_spending', title: 'Reduce food spending', status: 'active', priorityScore: 75 },
  ]);

  const req = makeReq();
  const result = await GET(req);

  expect(result.status).toBe(200);
  expect(Array.isArray(result.body.actions)).toBe(true);
  expect(result.body.actions[0].actionId).toBe('reduce_food_spending');
});

test('GET returns empty array when user has no actions', async () => {
  prisma.financialAction.findMany.mockResolvedValue([]);

  const req = makeReq();
  const result = await GET(req);

  expect(result.body.actions).toEqual([]);
});

test('GET returns 401 when unauthenticated', async () => {
  parseCookies.mockReturnValue({});

  const req = makeReq({}, '');
  const result = await GET(req);

  expect(result.status).toBe(401);
  expect(result.body.error).toBeDefined();
});

// ---------------------------------------------------------------------------
// POST /api/actions — Scenario A
// ---------------------------------------------------------------------------

test('Scenario A: POST creates FinancialAction with status active', async () => {
  prisma.financialAction.create.mockResolvedValue({
    id: 'fa1',
    actionId: 'reduce_food_spending',
    title: 'Reduce food spending',
    status: 'active',
    priorityScore: 75,
    acceptedAt: new Date(),
  });

  const req = makeReq({ actionId: 'reduce_food_spending', title: 'Reduce food spending', priorityScore: 75 });
  const result = await POST(req);

  expect(result.status).toBe(201);
  expect(result.body.action.status).toBe('active');
  expect(prisma.financialAction.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ actionId: 'reduce_food_spending', status: 'active' }),
    })
  );
});

test('POST returns 400 when actionId is missing', async () => {
  const req = makeReq({ title: 'Reduce food spending' });
  const result = await POST(req);

  expect(result.status).toBe(400);
  expect(result.body.error).toContain('actionId');
});

test('POST returns 400 when title is missing', async () => {
  const req = makeReq({ actionId: 'reduce_food_spending' });
  const result = await POST(req);

  expect(result.status).toBe(400);
  expect(result.body.error).toContain('title');
});

test('POST returns 401 when unauthenticated', async () => {
  parseCookies.mockReturnValue({});

  const req = makeReq({ actionId: 'reduce_food_spending', title: 'Test' }, '');
  const result = await POST(req);

  expect(result.status).toBe(401);
});
