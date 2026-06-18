// Tests for DELETE /api/transactions/[id] and PATCH /api/transactions/[id]

const MOCK_USER = { id: 'user-1', email: 'test@example.com' };
const MOCK_TX = {
  id: 'tx-1',
  userId: 'user-1',
  amount: 50,
  type: 'expense',
  categoryId: null,
  description: 'Coffee',
  occurredAt: new Date('2026-06-01T00:00:00Z'),
  createdAt: new Date('2026-06-01T00:00:00Z'),
};

jest.mock('../lib/prisma.js', () => ({
  user: { findUnique: jest.fn() },
  transaction: {
    findUnique: jest.fn(),
    delete:     jest.fn(async () => ({})),
    update:     jest.fn(),
  },
}));

jest.mock('../lib/auth.js', () => ({
  parseCookies: jest.fn(),
  verifyToken:  jest.fn(),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      body,
      status: init?.status || 200,
    })),
  },
}));

import prisma from '../lib/prisma.js';
import { parseCookies, verifyToken } from '../lib/auth.js';
import { DELETE, PATCH } from '../app/api/transactions/[id]/route.js';

function makeReq(bodyData = {}) {
  return {
    headers: { get: jest.fn((k) => (k === 'cookie' ? 'session=tok' : '')) },
    json: jest.fn(async () => bodyData),
  };
}

function makeParams(id = 'tx-1') {
  return Promise.resolve({ id });
}

beforeEach(() => {
  jest.clearAllMocks();
  parseCookies.mockReturnValue({ session: 'tok' });
  verifyToken.mockReturnValue({ id: 'user-1' });
  prisma.user.findUnique.mockResolvedValue(MOCK_USER);
  prisma.transaction.findUnique.mockResolvedValue(MOCK_TX);
  prisma.transaction.delete.mockResolvedValue(MOCK_TX);
  prisma.transaction.update.mockResolvedValue(MOCK_TX);
});

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------
test('DELETE: unauthenticated returns 401', async () => {
  parseCookies.mockReturnValue({});
  const result = await DELETE(makeReq(), { params: makeParams() });
  expect(result.status).toBe(401);
});

test('DELETE: transaction not found returns 404', async () => {
  prisma.transaction.findUnique.mockResolvedValue(null);
  const result = await DELETE(makeReq(), { params: makeParams() });
  expect(result.status).toBe(404);
});

test('DELETE: other user transaction returns 404 (no ID disclosure)', async () => {
  prisma.transaction.findUnique.mockResolvedValue({ ...MOCK_TX, userId: 'user-2' });
  const result = await DELETE(makeReq(), { params: makeParams() });
  expect(result.status).toBe(404);
  expect(prisma.transaction.delete).not.toHaveBeenCalled();
});

test('DELETE: own transaction → 200 and delete called with correct id', async () => {
  const result = await DELETE(makeReq(), { params: makeParams('tx-1') });
  expect(result.status).toBe(200);
  expect(result.body.success).toBe(true);
  expect(prisma.transaction.delete).toHaveBeenCalledTimes(1);
  expect(prisma.transaction.delete).toHaveBeenCalledWith({ where: { id: 'tx-1' } });
});

test('DELETE: delete is not called when auth fails', async () => {
  parseCookies.mockReturnValue({});
  await DELETE(makeReq(), { params: makeParams() });
  expect(prisma.transaction.delete).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------
test('PATCH: unauthenticated returns 401', async () => {
  parseCookies.mockReturnValue({});
  const result = await PATCH(makeReq(), { params: makeParams() });
  expect(result.status).toBe(401);
});

test('PATCH: transaction not found returns 404', async () => {
  prisma.transaction.findUnique.mockResolvedValue(null);
  const result = await PATCH(makeReq({ amount: '30' }), { params: makeParams() });
  expect(result.status).toBe(404);
});

test('PATCH: other user transaction returns 404', async () => {
  prisma.transaction.findUnique.mockResolvedValue({ ...MOCK_TX, userId: 'user-2' });
  const result = await PATCH(makeReq({ amount: '30' }), { params: makeParams() });
  expect(result.status).toBe(404);
  expect(prisma.transaction.update).not.toHaveBeenCalled();
});

test('PATCH: updates amount correctly', async () => {
  prisma.transaction.update.mockResolvedValue({ ...MOCK_TX, amount: 30 });
  const result = await PATCH(makeReq({ amount: '30' }), { params: makeParams() });
  expect(result.status).toBe(200);
  expect(result.body).toHaveProperty('transaction');
  expect(prisma.transaction.update).toHaveBeenCalledWith({
    where: { id: 'tx-1' },
    data: expect.objectContaining({ amount: 30 }),
  });
});

test('PATCH: undefined fields are excluded from update payload', async () => {
  await PATCH(makeReq({ amount: '30' }), { params: makeParams() });
  const updateData = prisma.transaction.update.mock.calls[0][0].data;
  expect(updateData).toHaveProperty('amount', 30);
  expect(updateData).not.toHaveProperty('type');
  expect(updateData).not.toHaveProperty('categoryId');
  expect(updateData).not.toHaveProperty('description');
  expect(updateData).not.toHaveProperty('occurredAt');
});

test('PATCH: null categoryId is coerced to null in update', async () => {
  await PATCH(makeReq({ categoryId: null }), { params: makeParams() });
  const updateData = prisma.transaction.update.mock.calls[0][0].data;
  expect(updateData).toHaveProperty('categoryId', null);
});

test('PATCH: empty description is coerced to null in update', async () => {
  await PATCH(makeReq({ description: '' }), { params: makeParams() });
  const updateData = prisma.transaction.update.mock.calls[0][0].data;
  expect(updateData).toHaveProperty('description', null);
});

test('PATCH: type and description updated together', async () => {
  prisma.transaction.update.mockResolvedValue({ ...MOCK_TX, type: 'income', description: 'Paycheck' });
  await PATCH(makeReq({ type: 'income', description: 'Paycheck' }), { params: makeParams() });
  const updateData = prisma.transaction.update.mock.calls[0][0].data;
  expect(updateData).toHaveProperty('type', 'income');
  expect(updateData).toHaveProperty('description', 'Paycheck');
});

test('PATCH: occurredAt is converted to Date', async () => {
  await PATCH(makeReq({ occurredAt: '2026-06-14T00:00:00.000Z' }), { params: makeParams() });
  const updateData = prisma.transaction.update.mock.calls[0][0].data;
  expect(updateData.occurredAt).toBeInstanceOf(Date);
});
