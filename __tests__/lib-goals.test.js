import { computeGoalProgress, parseTargetAmount, mapTimeframeToDueDate, getPrimaryGoal } from '../lib/goals.js';

// ---------------------------------------------------------------------------
// computeGoalProgress
// ---------------------------------------------------------------------------

const BASE_GOAL = {
  id: 'g1',
  title: 'Laptop Fund',
  targetAmount: 500,
  monthlyTarget: 100,
  startingBalance: 50,
  dueDate: null,
  status: 'active',
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 61), // ~2 months ago
  updatedAt: null,
};

const TXS_BALANCE_350 = [
  { type: 'income',  amount: 600 },
  { type: 'expense', amount: 250 },
];
// balance = 600 - 250 = 350; currentSaved = max(0, 350 - 50) = 300

const TXS_BALANCE_NEGATIVE = [
  { type: 'income',  amount: 100 },
  { type: 'expense', amount: 200 },
];
// balance = -100; currentSaved = max(0, -100 - 50) = 0

test('computeGoalProgress: empty goals returns empty array', () => {
  expect(computeGoalProgress([], [])).toEqual([]);
});

test('computeGoalProgress: currentSaved = max(0, balance - startingBalance)', () => {
  const [r] = computeGoalProgress([BASE_GOAL], TXS_BALANCE_350);
  expect(r.currentSaved).toBe(300);
});

test('computeGoalProgress: currentSaved is 0 when balance <= startingBalance', () => {
  const [r] = computeGoalProgress([BASE_GOAL], TXS_BALANCE_NEGATIVE);
  expect(r.currentSaved).toBe(0);
});

test('computeGoalProgress: progressPercent is correct', () => {
  const [r] = computeGoalProgress([BASE_GOAL], TXS_BALANCE_350);
  // 300 / 500 = 60%
  expect(r.progressPercent).toBe(60);
});

test('computeGoalProgress: progressPercent is capped at 100', () => {
  const richGoal = { ...BASE_GOAL, targetAmount: 10 };
  const [r] = computeGoalProgress([richGoal], TXS_BALANCE_350);
  expect(r.progressPercent).toBe(100);
});

test('computeGoalProgress: remainingAmount is 0 when goal reached', () => {
  const richGoal = { ...BASE_GOAL, targetAmount: 10 };
  const [r] = computeGoalProgress([richGoal], TXS_BALANCE_350);
  expect(r.remainingAmount).toBe(0);
});

test('computeGoalProgress: remainingAmount is correct when partially complete', () => {
  const [r] = computeGoalProgress([BASE_GOAL], TXS_BALANCE_350);
  // 500 - 300 = 200
  expect(r.remainingAmount).toBe(200);
});

test('computeGoalProgress: progressPercent is 0 when targetAmount is 0', () => {
  const zeroGoal = { ...BASE_GOAL, targetAmount: 0 };
  const [r] = computeGoalProgress([zeroGoal], TXS_BALANCE_350);
  expect(r.progressPercent).toBe(0);
});

test('computeGoalProgress: isOnTrack true when pace meets monthlyTarget', () => {
  // goalAgeMonths ≈ 2, currentSaved = 300 → pace = 150/month, target = 100 → on track
  const [r] = computeGoalProgress([BASE_GOAL], TXS_BALANCE_350);
  expect(r.isOnTrack).toBe(true);
});

test('computeGoalProgress: isOnTrack false when pace is below monthlyTarget', () => {
  // pace ≈ 150/month but set monthlyTarget = 200 → not on track
  const slowGoal = { ...BASE_GOAL, monthlyTarget: 200 };
  const [r] = computeGoalProgress([slowGoal], TXS_BALANCE_350);
  expect(r.isOnTrack).toBe(false);
});

test('computeGoalProgress: isOnTrack is null when monthlyTarget is not set', () => {
  const noTargetGoal = { ...BASE_GOAL, monthlyTarget: null };
  const [r] = computeGoalProgress([noTargetGoal], TXS_BALANCE_350);
  expect(r.isOnTrack).toBeNull();
});

test('computeGoalProgress: monthsRemaining and requiredMonthly are null when no dueDate', () => {
  const [r] = computeGoalProgress([BASE_GOAL], TXS_BALANCE_350);
  expect(r.monthsRemaining).toBeNull();
  expect(r.requiredMonthlyToHitTarget).toBeNull();
});

test('computeGoalProgress: monthsRemaining computed when dueDate is set', () => {
  const future = new Date();
  future.setMonth(future.getMonth() + 3);
  const goalWithDue = { ...BASE_GOAL, dueDate: future };
  const [r] = computeGoalProgress([goalWithDue], TXS_BALANCE_350);
  expect(r.monthsRemaining).toBeGreaterThan(0);
  expect(r.requiredMonthlyToHitTarget).toBeGreaterThan(0);
});

test('computeGoalProgress: null startingBalance treated as 0 (backfill tradeoff)', () => {
  const backfilledGoal = { ...BASE_GOAL, startingBalance: null };
  // balance = 350, startingBalance treated as 0 → currentSaved = 350
  const [r] = computeGoalProgress([backfilledGoal], TXS_BALANCE_350);
  expect(r.currentSaved).toBe(350);
  expect(r.startingBalance).toBe(0);
});

test('computeGoalProgress: currentAmount field is not present (not computed here)', () => {
  const [r] = computeGoalProgress([BASE_GOAL], TXS_BALANCE_350);
  expect(r).not.toHaveProperty('currentAmount');
});

// ---------------------------------------------------------------------------
// parseTargetAmount
// ---------------------------------------------------------------------------

test('parseTargetAmount: dollar-sign prefix', () => {
  expect(parseTargetAmount('Save $500 by June')).toBe(500);
});

test('parseTargetAmount: dollar-sign with comma-separated amount', () => {
  expect(parseTargetAmount('Need $2,000 for rent')).toBe(2000);
});

test('parseTargetAmount: no dollar sign — bare number', () => {
  expect(parseTargetAmount('save 500 by June')).toBe(500);
});

test('parseTargetAmount: "N dollars" suffix', () => {
  expect(parseTargetAmount('500 dollars')).toBe(500);
});

test('parseTargetAmount: 4-digit year not extracted', () => {
  expect(parseTargetAmount('Save for college by 2027')).toBe(0);
});

test('parseTargetAmount: dollar amount preferred over year in same string', () => {
  expect(parseTargetAmount('Save $500 for 2027 graduation')).toBe(500);
});

test('parseTargetAmount: bare number after year-containing text', () => {
  expect(parseTargetAmount('Save 300 by June 2027')).toBe(300);
});

test('parseTargetAmount: empty string returns 0', () => {
  expect(parseTargetAmount('')).toBe(0);
});

test('parseTargetAmount: null/undefined returns 0', () => {
  expect(parseTargetAmount(null)).toBe(0);
  expect(parseTargetAmount(undefined)).toBe(0);
});

test('parseTargetAmount: text-only goal returns 0', () => {
  expect(parseTargetAmount('I want to build better financial habits')).toBe(0);
});

// Sprint 12.5 — unformatted 4-digit+ amounts (validation matrix)
test('parseTargetAmount: $100 → 100', () => {
  expect(parseTargetAmount('$100')).toBe(100);
});

test('parseTargetAmount: $999 → 999', () => {
  expect(parseTargetAmount('$999')).toBe(999);
});

test('parseTargetAmount: $1000 (unformatted 4-digit) → 1000', () => {
  expect(parseTargetAmount('$1000')).toBe(1000);
});

test('parseTargetAmount: bare 1000 (no dollar sign) → 1000', () => {
  expect(parseTargetAmount('1000')).toBe(1000);
});

test('parseTargetAmount: $1,000 (comma-formatted) → 1000', () => {
  expect(parseTargetAmount('$1,000')).toBe(1000);
});

test('parseTargetAmount: 1000 dollars → 1000', () => {
  expect(parseTargetAmount('1000 dollars')).toBe(1000);
});

test('parseTargetAmount: save 2500 → 2500', () => {
  expect(parseTargetAmount('save 2500')).toBe(2500);
});

test('parseTargetAmount: save $2,500 → 2500', () => {
  expect(parseTargetAmount('save $2,500')).toBe(2500);
});

test('parseTargetAmount: save $25,000 → 25000', () => {
  expect(parseTargetAmount('save $25,000')).toBe(25000);
});

test('parseTargetAmount: save $250000 (large unformatted) → 250000', () => {
  expect(parseTargetAmount('save $250000')).toBe(250000);
});

test('parseTargetAmount: year filter still applies to standalone 4-digit year', () => {
  expect(parseTargetAmount('save for 2027')).toBe(0);
});

test('parseTargetAmount: dollar amount beats year in same string', () => {
  expect(parseTargetAmount('save $1000 by 2027')).toBe(1000);
});

// ---------------------------------------------------------------------------
// mapTimeframeToDueDate
// ---------------------------------------------------------------------------

test('mapTimeframeToDueDate: "1 month" adds 1 month', () => {
  const from = new Date('2026-06-14T00:00:00Z');
  const result = mapTimeframeToDueDate('1 month', from);
  expect(result.getMonth()).toBe(6); // July (0-indexed)
  expect(result.getFullYear()).toBe(2026);
});

test('mapTimeframeToDueDate: "3 months" adds 3 months', () => {
  const from = new Date('2026-06-14T00:00:00Z');
  const result = mapTimeframeToDueDate('3 months', from);
  expect(result.getMonth()).toBe(8); // September
});

test('mapTimeframeToDueDate: "6 months" adds 6 months', () => {
  const from = new Date('2026-06-14T00:00:00Z');
  const result = mapTimeframeToDueDate('6 months', from);
  expect(result.getMonth()).toBe(11); // December
});

test('mapTimeframeToDueDate: "1 year" adds 1 year', () => {
  const from = new Date('2026-06-14T00:00:00Z');
  const result = mapTimeframeToDueDate('1 year', from);
  expect(result.getFullYear()).toBe(2027);
});

test('mapTimeframeToDueDate: empty string returns null', () => {
  expect(mapTimeframeToDueDate('')).toBeNull();
  expect(mapTimeframeToDueDate(null)).toBeNull();
  expect(mapTimeframeToDueDate(undefined)).toBeNull();
});

test('mapTimeframeToDueDate: unrecognized string returns null', () => {
  expect(mapTimeframeToDueDate('2 weeks')).toBeNull();
  expect(mapTimeframeToDueDate('forever')).toBeNull();
});

// ---------------------------------------------------------------------------
// getPrimaryGoal — Scenario A/B/C/D coverage
// ---------------------------------------------------------------------------

const GOAL_RECORD = {
  id: 'g1', title: 'Laptop', targetAmount: 1200,
  currentSaved: 300, progressPercent: 25,
};

test('getPrimaryGoal: Scenario B — Goal record present → returns Goal record (canonical)', () => {
  const result = getPrimaryGoal([GOAL_RECORD], { goalType: 'Old Label', goal: 'Old Label' });
  expect(result).toBe(GOAL_RECORD);
  expect(result.title).toBe('Laptop');
  expect(result.onboardingOnly).toBeUndefined();
});

test('getPrimaryGoal: Scenario A — no Goal record, onboarding goalType → synthetic object', () => {
  const result = getPrimaryGoal([], { goalType: 'Laptop', goal: 'Laptop' });
  expect(result).not.toBeNull();
  expect(result.title).toBe('Laptop');
  expect(result.targetAmount).toBeNull();
  expect(result.onboardingOnly).toBe(true);
});

test('getPrimaryGoal: legacy onboarding.goal fallback when goalType absent', () => {
  const result = getPrimaryGoal([], { goal: 'Save $500' });
  expect(result.title).toBe('Save $500');
  expect(result.onboardingOnly).toBe(true);
});

test('getPrimaryGoal: Scenario D — Goal deleted, onboarding present → returns onboarding fallback', () => {
  const result = getPrimaryGoal([], { goalType: 'Laptop' });
  expect(result.title).toBe('Laptop');
  expect(result.onboardingOnly).toBe(true);
});

test('getPrimaryGoal: no Goal record, no onboarding → null', () => {
  expect(getPrimaryGoal([], null)).toBeNull();
  expect(getPrimaryGoal([], {})).toBeNull();
  expect(getPrimaryGoal()).toBeNull();
});

test('getPrimaryGoal: Scenario C — renamed Goal title propagates without onboarding confusion', () => {
  const renamed = { ...GOAL_RECORD, title: 'MacBook Pro' };
  // Onboarding still has old label — getPrimaryGoal prefers Goal record
  const result = getPrimaryGoal([renamed], { goalType: 'Laptop', goal: 'Laptop' });
  expect(result.title).toBe('MacBook Pro');
});

test('getPrimaryGoal: empty goals array with undefined onboarding → null', () => {
  expect(getPrimaryGoal([])).toBeNull();
});
