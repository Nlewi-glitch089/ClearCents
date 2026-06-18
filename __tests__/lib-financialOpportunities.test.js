import { buildFinancialOpportunities, computeOpportunityScore } from '../lib/financialOpportunities.js';

function makeSignals({
  spendingChanges = [],
  savingsRateDelta = null,
  thisMonthSavingsRate = null,
  lastMonthSavingsRate = null,
} = {}) {
  return {
    savingsRate: savingsRateDelta != null
      ? { current: thisMonthSavingsRate, previous: lastMonthSavingsRate, delta: savingsRateDelta }
      : null,
    spendingChanges,
    consistency: null,
    goals: [],
    supportingSignals: [],
    supportingData: [],
  };
}

function makeMemory({
  recurringPatterns = [],
  improvingPatterns = [],
  worseningPatterns = [],
  resolvedAlerts = [],
  streaks = {},
} = {}) {
  return {
    recurringPatterns,
    improvingPatterns,
    worseningPatterns,
    newlyTriggeredAlerts: [],
    resolvedAlerts,
    ongoingAlerts: [],
    streaks,
    repeated: false,
  };
}

function makeGoal({ title = 'Laptop', forecastMonths = null, confidence = 'medium' } = {}) {
  return {
    id: 'g1',
    title,
    targetAmount: 1200,
    status: 'active',
    forecast: forecastMonths != null
      ? { projectedCompletionMonths: forecastMonths, projectedCompletionDate: null, monthlyContribution: 100, confidence }
      : { projectedCompletionMonths: null, projectedCompletionDate: null, monthlyContribution: null, confidence: null },
    milestones: { reached25: false, reached50: false, reached75: false, completed: false },
  };
}

// ---------------------------------------------------------------------------
// computeOpportunityScore
// ---------------------------------------------------------------------------

test('computeOpportunityScore: high magnitude + high confidence → high score', () => {
  const score = computeOpportunityScore({ magnitude: 65, persistence: 1, confidence: 'high', hasGoalImpact: false });
  expect(score).toBeGreaterThanOrEqual(70);
});

test('computeOpportunityScore: persistence bonus increases score', () => {
  const base = computeOpportunityScore({ magnitude: 40, persistence: 1, confidence: 'medium', hasGoalImpact: false });
  const higher = computeOpportunityScore({ magnitude: 40, persistence: 3, confidence: 'medium', hasGoalImpact: false });
  expect(higher).toBeGreaterThan(base);
});

test('computeOpportunityScore: goal impact multiplier increases score', () => {
  const without = computeOpportunityScore({ magnitude: 40, persistence: 1, confidence: 'medium', hasGoalImpact: false });
  const withGoal = computeOpportunityScore({ magnitude: 40, persistence: 1, confidence: 'medium', hasGoalImpact: true });
  expect(withGoal).toBeGreaterThan(without);
});

test('computeOpportunityScore: low confidence decreases score relative to medium', () => {
  const medium = computeOpportunityScore({ magnitude: 50, persistence: 1, confidence: 'medium', hasGoalImpact: false });
  const low = computeOpportunityScore({ magnitude: 50, persistence: 1, confidence: 'low', hasGoalImpact: false });
  expect(low).toBeLessThan(medium);
});

test('computeOpportunityScore: score is capped at 100', () => {
  const score = computeOpportunityScore({ magnitude: 100, persistence: 10, confidence: 'high', hasGoalImpact: true });
  expect(score).toBeLessThanOrEqual(100);
});

// ---------------------------------------------------------------------------
// Scenario A — Spending reduction (elevated for 3 cycles)
// ---------------------------------------------------------------------------

test('Scenario A: food +38% for 3 cycles → reduce_food_spending is top opportunity', () => {
  const signals = makeSignals({ spendingChanges: [{ category: 'Food', pctChange: 38, currentAmount: 187, previousAmount: 135 }] });
  const memory = makeMemory({ recurringPatterns: ['food_spending_increase'], worseningPatterns: ['food_spend'] });

  const { opportunities } = buildFinancialOpportunities({ signals, memory, goals: [makeGoal()] });

  expect(opportunities.length).toBeGreaterThan(0);
  expect(opportunities[0].id).toBe('reduce_food_spending');
});

test('Scenario A: recurring spending → description says "remains elevated"', () => {
  const signals = makeSignals({ spendingChanges: [{ category: 'Food', pctChange: 38, currentAmount: 187, previousAmount: 135 }] });
  const memory = makeMemory({ recurringPatterns: ['food_spending_increase'] });

  const { opportunities } = buildFinancialOpportunities({ signals, memory });

  expect(opportunities[0].description).toContain('remains elevated');
});

test('food +55% → HIGH IMPACT score (>= 70)', () => {
  const signals = makeSignals({ spendingChanges: [{ category: 'Food', pctChange: 55, currentAmount: 210, previousAmount: 135 }] });
  const memory = makeMemory({ worseningPatterns: ['food_spend'] });

  const { opportunities } = buildFinancialOpportunities({ signals, memory, goals: [makeGoal()] });

  expect(opportunities[0].impactScore).toBeGreaterThanOrEqual(70);
});

test('spending increase < 25% → no spending opportunity generated', () => {
  const signals = makeSignals({ spendingChanges: [{ category: 'Food', pctChange: 20, currentAmount: 162, previousAmount: 135 }] });

  const { opportunities } = buildFinancialOpportunities({ signals });

  expect(opportunities.find(o => o.category === 'spending')).toBeUndefined();
});

test('spending opportunity id uses lowercase underscore from category', () => {
  const signals = makeSignals({ spendingChanges: [{ category: 'Dining Out', pctChange: 30, currentAmount: 100, previousAmount: 77 }] });

  const { opportunities } = buildFinancialOpportunities({ signals });

  expect(opportunities[0].id).toBe('reduce_dining_out_spending');
});

// ---------------------------------------------------------------------------
// Scenario B — Goal acceleration and savings improvement
// ---------------------------------------------------------------------------

test('Scenario B: goal with forecast → goal_acceleration opportunity generated', () => {
  const goals = [makeGoal({ forecastMonths: 5 })];

  const { opportunities } = buildFinancialOpportunities({ goals });

  expect(opportunities.some(o => o.id === 'goal_acceleration')).toBe(true);
});

test('Scenario B: savings rate improvement → increase_goal_contributions opportunity', () => {
  const signals = makeSignals({ savingsRateDelta: 12, thisMonthSavingsRate: 31, lastMonthSavingsRate: 19 });

  const { opportunities } = buildFinancialOpportunities({ signals, goals: [makeGoal()] });

  expect(opportunities.some(o => o.id === 'increase_goal_contributions')).toBe(true);
});

test('savings rate improvement in memory raises goal_acceleration score', () => {
  const baseGoal = [makeGoal({ forecastMonths: 5 })];
  const withoutMem = buildFinancialOpportunities({ goals: baseGoal }).opportunities.find(o => o.id === 'goal_acceleration');
  const withMem = buildFinancialOpportunities({ goals: baseGoal, memory: makeMemory({ improvingPatterns: ['savings_rate'] }) }).opportunities.find(o => o.id === 'goal_acceleration');

  expect(withMem.impactScore).toBeGreaterThan(withoutMem.impactScore);
});

test('goal with no forecast → no goal_acceleration opportunity', () => {
  const goals = [makeGoal({ forecastMonths: null })];

  const { opportunities } = buildFinancialOpportunities({ goals });

  expect(opportunities.find(o => o.id === 'goal_acceleration')).toBeUndefined();
});

test('savings rate delta < 10 → no increase_goal_contributions opportunity', () => {
  const signals = makeSignals({ savingsRateDelta: 5, thisMonthSavingsRate: 25, lastMonthSavingsRate: 20 });

  const { opportunities } = buildFinancialOpportunities({ signals });

  expect(opportunities.find(o => o.id === 'increase_goal_contributions')).toBeUndefined();
});

// ---------------------------------------------------------------------------
// Scenario C — No significant changes
// ---------------------------------------------------------------------------

test('Scenario C: no alerts, no signals, no goals → opportunities empty', () => {
  const { opportunities } = buildFinancialOpportunities();
  expect(opportunities).toEqual([]);
});

test('Scenario C: sub-threshold spending, no goals → empty', () => {
  const signals = makeSignals({ spendingChanges: [{ category: 'Food', pctChange: 10, currentAmount: 149, previousAmount: 135 }] });
  const { opportunities } = buildFinancialOpportunities({ signals });
  expect(opportunities).toEqual([]);
});

// ---------------------------------------------------------------------------
// Scenario D — Sorting by impactScore descending
// ---------------------------------------------------------------------------

test('Scenario D: multiple opportunities → sorted by impactScore descending', () => {
  const signals = makeSignals({
    spendingChanges: [{ category: 'Food', pctChange: 38, currentAmount: 187, previousAmount: 135 }],
    savingsRateDelta: 12,
    thisMonthSavingsRate: 31,
    lastMonthSavingsRate: 19,
  });
  const goals = [makeGoal({ forecastMonths: 5 })];
  const memory = makeMemory({ worseningPatterns: ['food_spend'] });

  const { opportunities } = buildFinancialOpportunities({ signals, memory, goals });

  for (let i = 0; i < opportunities.length - 1; i++) {
    expect(opportunities[i].impactScore).toBeGreaterThanOrEqual(opportunities[i + 1].impactScore);
  }
});

test('Scenario D: high-impact opportunity appears before medium-impact', () => {
  const signals = makeSignals({
    spendingChanges: [{ category: 'Food', pctChange: 75, currentAmount: 270, previousAmount: 135 }],
  });
  const goals = [makeGoal({ forecastMonths: 5 })];

  const { opportunities } = buildFinancialOpportunities({ signals, goals });

  const spendingOp = opportunities.find(o => o.category === 'spending');
  const goalOp = opportunities.find(o => o.id === 'goal_acceleration');
  expect(spendingOp.impactScore).toBeGreaterThan(goalOp.impactScore);
  expect(opportunities[0].category).toBe('spending');
});

// ---------------------------------------------------------------------------
// Scenario E — Resolved opportunity (signal no longer present)
// ---------------------------------------------------------------------------

test('Scenario E: food signal absent → no spending opportunity generated', () => {
  const signals = makeSignals();

  const { opportunities } = buildFinancialOpportunities({ signals });

  expect(opportunities.find(o => o.category === 'spending')).toBeUndefined();
});

test('Scenario E: spending dropped below threshold → opportunity disappears', () => {
  const signals = makeSignals({ spendingChanges: [{ category: 'Food', pctChange: 15, currentAmount: 155, previousAmount: 135 }] });

  const { opportunities } = buildFinancialOpportunities({ signals });

  expect(opportunities.find(o => o.id === 'reduce_food_spending')).toBeUndefined();
});

// ---------------------------------------------------------------------------
// Habit reinforcement
// ---------------------------------------------------------------------------

test('memory streak >= 3 cycles → maintain_tracking_habit opportunity', () => {
  const memory = makeMemory({ streaks: { savings_rate_improvement: 3 } });

  const { opportunities } = buildFinancialOpportunities({ memory });

  expect(opportunities.find(o => o.id === 'maintain_tracking_habit')).toBeDefined();
});

test('memory streak < 3 cycles → no habit opportunity', () => {
  const memory = makeMemory({ streaks: { savings_rate_improvement: 2 } });

  const { opportunities } = buildFinancialOpportunities({ memory });

  expect(opportunities.find(o => o.id === 'maintain_tracking_habit')).toBeUndefined();
});

// ---------------------------------------------------------------------------
// Structure validation
// ---------------------------------------------------------------------------

test('each opportunity has required fields: id, category, impactScore, confidence, title, description', () => {
  const signals = makeSignals({ spendingChanges: [{ category: 'Food', pctChange: 40, currentAmount: 189, previousAmount: 135 }] });
  const { opportunities } = buildFinancialOpportunities({ signals });

  for (const op of opportunities) {
    expect(op).toHaveProperty('id');
    expect(op).toHaveProperty('category');
    expect(op).toHaveProperty('impactScore');
    expect(op).toHaveProperty('confidence');
    expect(op).toHaveProperty('title');
    expect(op).toHaveProperty('description');
  }
});

test('impactScore is a number between 0 and 100', () => {
  const signals = makeSignals({ spendingChanges: [{ category: 'Food', pctChange: 40, currentAmount: 189, previousAmount: 135 }] });
  const { opportunities } = buildFinancialOpportunities({ signals });

  for (const op of opportunities) {
    expect(typeof op.impactScore).toBe('number');
    expect(op.impactScore).toBeGreaterThanOrEqual(0);
    expect(op.impactScore).toBeLessThanOrEqual(100);
  }
});
