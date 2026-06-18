jest.mock('../lib/prisma.js', () => ({
  user: { findUnique: jest.fn() },
  financialAction: {
    findFirst: jest.fn(),
    update: jest.fn(),
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
import { PATCH } from '../app/api/actions/[id]/route.js';

const ACTIVE_ACTION = {
  id: 'fa1',
  userId: 'u1',
  actionId: 'reduce_food_spending',
  title: 'Reduce food spending',
  status: 'active',
  priorityScore: 75,
  acceptedAt: new Date(),
};

function makeReq(bodyData = {}, cookieHeader = 'session=tok') {
  return {
    headers: { get: jest.fn((k) => (k === 'cookie' ? cookieHeader : '')) },
    json: jest.fn(async () => bodyData),
  };
}

const PARAMS = { params: { id: 'fa1' } };

beforeEach(() => {
  jest.clearAllMocks();
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'u1' });
  prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
  prisma.financialAction.findFirst.mockResolvedValue(ACTIVE_ACTION);
});

// ---------------------------------------------------------------------------
// Scenario B — complete action
// ---------------------------------------------------------------------------

test('Scenario B: PATCH transitions active → completed', async () => {
  prisma.financialAction.update.mockResolvedValue({ ...ACTIVE_ACTION, status: 'completed', completedAt: new Date() });

  const req = makeReq({ status: 'completed' });
  const result = await PATCH(req, PARAMS);

  expect(result.status).toBe(200);
  expect(result.body.action.status).toBe('completed');
});

test('Scenario B: PATCH sets completedAt when completing', async () => {
  const now = new Date();
  prisma.financialAction.update.mockResolvedValue({ ...ACTIVE_ACTION, status: 'completed', completedAt: now });

  const req = makeReq({ status: 'completed' });
  await PATCH(req, PARAMS);

  expect(prisma.financialAction.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ completedAt: expect.any(Date) }),
    })
  );
});

test('PATCH transitions active → dismissed', async () => {
  prisma.financialAction.update.mockResolvedValue({ ...ACTIVE_ACTION, status: 'dismissed', dismissedAt: new Date() });

  const req = makeReq({ status: 'dismissed' });
  const result = await PATCH(req, PARAMS);

  expect(result.body.action.status).toBe('dismissed');
});

test('PATCH sets dismissedAt when dismissing', async () => {
  prisma.financialAction.update.mockResolvedValue({ ...ACTIVE_ACTION, status: 'dismissed', dismissedAt: new Date() });

  const req = makeReq({ status: 'dismissed' });
  await PATCH(req, PARAMS);

  expect(prisma.financialAction.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ dismissedAt: expect.any(Date) }),
    })
  );
});

test('PATCH transitions active → abandoned', async () => {
  prisma.financialAction.update.mockResolvedValue({ ...ACTIVE_ACTION, status: 'abandoned' });

  const req = makeReq({ status: 'abandoned' });
  const result = await PATCH(req, PARAMS);

  expect(result.body.action.status).toBe('abandoned');
});

test('PATCH returns 422 for invalid transition (completed → active)', async () => {
  prisma.financialAction.findFirst.mockResolvedValue({ ...ACTIVE_ACTION, status: 'completed' });

  const req = makeReq({ status: 'active' });
  const result = await PATCH(req, PARAMS);

  expect(result.status).toBe(422);
  expect(result.body.error).toContain('Cannot transition');
});

test('PATCH returns 404 when action not found', async () => {
  prisma.financialAction.findFirst.mockResolvedValue(null);

  const req = makeReq({ status: 'completed' });
  const result = await PATCH(req, PARAMS);

  expect(result.status).toBe(404);
});

test('PATCH returns 401 when unauthenticated', async () => {
  parseCookies.mockReturnValue({});

  const req = makeReq({ status: 'completed' }, '');
  const result = await PATCH(req, PARAMS);

  expect(result.status).toBe(401);
});

test('PATCH returns 400 when status is missing', async () => {
  const req = makeReq({});
  const result = await PATCH(req, PARAMS);

  expect(result.status).toBe(400);
  expect(result.body.error).toContain('status');
});
