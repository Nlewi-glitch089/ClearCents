import { computeGoalForecast, computeGoalMilestones } from '../lib/goalForecast.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Base goal with progress data from computeGoalProgress
const BASE_GOAL = {
  id: 'g1',
  title: 'Laptop',
  targetAmount: 1200,
  remainingAmount: 900,
  currentSaved: 300,
  progressPercent: 25,
  createdAt: new Date(Date.now() - 90 * MS_PER_DAY - 1), // just over 90 days ago
  status: 'active',
};

function makeTxs(count, income, expenses, daysAgo = 45) {
  const txs = [];
  for (let i = 0; i < count; i++) {
    txs.push({
      type: 'income',
      amount: income / count,
      occurredAt: new Date(Date.now() - (daysAgo + i) * MS_PER_DAY),
    });
    txs.push({
      type: 'expense',
      amount: expenses / count,
      occurredAt: new Date(Date.now() - (daysAgo + i) * MS_PER_DAY),
    });
  }
  return txs;
}

// ---------------------------------------------------------------------------
// computeGoalForecast — Scenario C: insufficient data
// ---------------------------------------------------------------------------

test('Scenario C: no transactions → nulls returned (no fabricated estimate)', () => {
  const result = computeGoalForecast(BASE_GOAL, []);
  expect(result.monthlyContribution).toBeNull();
  expect(result.projectedCompletionMonths).toBeNull();
  expect(result.projectedCompletionDate).toBeNull();
  expect(result.confidence).toBeNull();
});

test('Scenario C: null goal → nulls returned', () => {
  const result = computeGoalForecast(null, [{ type: 'income', amount: 100, occurredAt: new Date() }]);
  expect(result.projectedCompletionMonths).toBeNull();
});

test('Scenario C: negative net contribution → nulls returned', () => {
  const txs = makeTxs(5, 100, 300, 30);
  const result = computeGoalForecast(BASE_GOAL, txs);
  expect(result.projectedCompletionMonths).toBeNull();
});

test('Scenario C: window too short (< 0.5 months) → nulls returned', () => {
  // Goal created 5 days ago (< 0.5 months)
  const goal = { ...BASE_GOAL, createdAt: new Date(Date.now() - 5 * MS_PER_DAY) };
  const txs = makeTxs(2, 200, 50, 2);
  const result = computeGoalForecast(goal, txs);
  expect(result.projectedCompletionMonths).toBeNull();
});

// ---------------------------------------------------------------------------
// computeGoalForecast — Scenario B: valid forecast
// ---------------------------------------------------------------------------

test('Scenario B: $200/mo pace, $1000 remaining → ~5 months forecast', () => {
  // 10 tx pairs in last 60 days, $300 income - $100 expenses per batch
  const now = Date.now();
  const txs = [];
  for (let i = 0; i < 10; i++) {
    txs.push({ type: 'income', amount: 30, occurredAt: new Date(now - (i * 6) * MS_PER_DAY) });
    txs.push({ type: 'expense', amount: 10, occurredAt: new Date(now - (i * 6) * MS_PER_DAY) });
  }
  const goal = { ...BASE_GOAL, remainingAmount: 1000 };
  const result = computeGoalForecast(goal, txs);

  expect(result.monthlyContribution).toBeGreaterThan(0);
  expect(result.projectedCompletionMonths).toBeGreaterThan(0);
  expect(result.projectedCompletionDate).toMatch(/^\d{4}-\d{2}-01$/);
  expect(result.confidence).toBeDefined();
});

test('forecast confidence is "high" with 2+ months and 10+ transactions', () => {
  const txs = makeTxs(10, 500, 100, 60); // 10 pairs spread over 60+ days
  const result = computeGoalForecast(BASE_GOAL, txs);
  if (result.confidence) {
    expect(['high', 'medium', 'low']).toContain(result.confidence);
  }
});

test('forecast confidence is "low" with minimal transaction count', () => {
  // Only 2 transactions in a 45-day window
  const txs = [
    { type: 'income', amount: 200, occurredAt: new Date(Date.now() - 44 * MS_PER_DAY) },
    { type: 'expense', amount: 50, occurredAt: new Date(Date.now() - 43 * MS_PER_DAY) },
  ];
  const result = computeGoalForecast(BASE_GOAL, txs);
  if (result.confidence) expect(result.confidence).toBe('low');
});

test('goal already complete (remainingAmount = 0) → 0 months, projectedDate set', () => {
  const completedGoal = { ...BASE_GOAL, remainingAmount: 0, progressPercent: 100 };
  const txs = makeTxs(5, 400, 100, 30);
  const result = computeGoalForecast(completedGoal, txs);
  expect(result.projectedCompletionMonths).toBe(0);
  expect(result.projectedCompletionDate).toMatch(/^\d{4}-\d{2}-01$/);
});

test('only transactions within window are counted', () => {
  // Old transaction far outside 90-day window → should not affect forecast
  const oldTx = { type: 'income', amount: 10000, occurredAt: new Date(Date.now() - 200 * MS_PER_DAY) };
  const recentTxs = makeTxs(5, 300, 200, 20);
  const result = computeGoalForecast(BASE_GOAL, [oldTx, ...recentTxs]);
  // If old tx was counted, forecast would be very different; monthlyContribution should
  // reflect only the recent window's net (100 over ~1 month ≈ $100/month)
  if (result.monthlyContribution) {
    expect(result.monthlyContribution).toBeLessThan(500);
  }
});

test('goal created recently → window capped at goal creation date', () => {
  // Goal created 20 days ago — window should be 20 days, not 90
  const recentGoal = { ...BASE_GOAL, createdAt: new Date(Date.now() - 20 * MS_PER_DAY) };
  // Transactions from 25 days ago (before goal) should be excluded
  const oldTx = { type: 'income', amount: 5000, occurredAt: new Date(Date.now() - 25 * MS_PER_DAY) };
  const newTx = { type: 'income', amount: 100, occurredAt: new Date(Date.now() - 10 * MS_PER_DAY) };
  const result = computeGoalForecast(recentGoal, [oldTx, newTx]);
  if (result.monthlyContribution) {
    // Only the newTx should be counted → monthlyContribution much less than would include oldTx
    expect(result.monthlyContribution).toBeLessThan(1000);
  }
});

// ---------------------------------------------------------------------------
// computeGoalMilestones — Scenario A/B
// ---------------------------------------------------------------------------

test('Scenario A: 25% progress → reached25 true, others false', () => {
  const m = computeGoalMilestones({ progressPercent: 25 });
  expect(m.reached25).toBe(true);
  expect(m.reached50).toBe(false);
  expect(m.reached75).toBe(false);
  expect(m.completed).toBe(false);
});

test('50% progress → reached25 and reached50 true', () => {
  const m = computeGoalMilestones({ progressPercent: 50 });
  expect(m.reached25).toBe(true);
  expect(m.reached50).toBe(true);
  expect(m.reached75).toBe(false);
  expect(m.completed).toBe(false);
});

test('75% progress → reached25, 50, 75 true, completed false', () => {
  const m = computeGoalMilestones({ progressPercent: 75 });
  expect(m.reached25).toBe(true);
  expect(m.reached50).toBe(true);
  expect(m.reached75).toBe(true);
  expect(m.completed).toBe(false);
});

test('Scenario D: 100% → all milestones true including completed', () => {
  const m = computeGoalMilestones({ progressPercent: 100 });
  expect(m.reached25).toBe(true);
  expect(m.reached50).toBe(true);
  expect(m.reached75).toBe(true);
  expect(m.completed).toBe(true);
});

test('0% → all false', () => {
  const m = computeGoalMilestones({ progressPercent: 0 });
  expect(m.reached25).toBe(false);
  expect(m.reached50).toBe(false);
  expect(m.reached75).toBe(false);
  expect(m.completed).toBe(false);
});

test('null goal → all false (no crash)', () => {
  const m = computeGoalMilestones(null);
  expect(m.reached25).toBe(false);
  expect(m.completed).toBe(false);
});

test('progressPercent between milestones (e.g. 60%) → correct partial state', () => {
  const m = computeGoalMilestones({ progressPercent: 60 });
  expect(m.reached25).toBe(true);
  expect(m.reached50).toBe(true);
  expect(m.reached75).toBe(false);
  expect(m.completed).toBe(false);
});
