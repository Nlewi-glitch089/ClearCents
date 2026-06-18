import { buildFinancialSignals } from '../lib/financialSignals.js';

// ---------------------------------------------------------------------------
// Scenario A — Spending increase
// ---------------------------------------------------------------------------

test('Scenario A: food +38% → food_spending_increase signal with correct supportingData', () => {
  const result = buildFinancialSignals({
    trends: {
      categoryIncreases: [{ name: 'Food', pctChange: 38, thisMonthAmount: 187, lastMonthAmount: 135 }],
      categoryDecreases: [],
      thisMonthSavingsRate: null,
      lastMonthSavingsRate: null,
      savingsRateDelta: null,
    },
  });

  expect(result.supportingSignals).toContain('food_spending_increase');
  expect(result.spendingChanges).toHaveLength(1);
  expect(result.spendingChanges[0]).toMatchObject({ category: 'Food', pctChange: 38, currentAmount: 187, previousAmount: 135 });
  expect(result.supportingData).toContainEqual({ label: 'Food Spending', value: '+38%' });
});

test('Scenario A: signal id uses lowercase underscored category name', () => {
  const result = buildFinancialSignals({
    trends: {
      categoryIncreases: [{ name: 'Dining Out', pctChange: 20, thisMonthAmount: 120, lastMonthAmount: 100 }],
      categoryDecreases: [],
      thisMonthSavingsRate: null,
      lastMonthSavingsRate: null,
      savingsRateDelta: null,
    },
  });
  expect(result.supportingSignals).toContain('dining_out_spending_increase');
});

// ---------------------------------------------------------------------------
// Scenario B — Savings rate improvement
// ---------------------------------------------------------------------------

test('Scenario B: 19% → 31% savings rate → savings_rate_improvement signal', () => {
  const result = buildFinancialSignals({
    trends: {
      categoryIncreases: [],
      categoryDecreases: [],
      thisMonthSavingsRate: 31,
      lastMonthSavingsRate: 19,
      savingsRateDelta: 12,
    },
  });

  expect(result.supportingSignals).toContain('savings_rate_improvement');
  expect(result.savingsRate).toEqual({ current: 31, previous: 19, delta: 12 });
  expect(result.supportingData).toContainEqual({ label: 'Savings Rate', value: '+12 pts' });
});

test('savings rate decline → savings_rate_decline signal', () => {
  const result = buildFinancialSignals({
    trends: {
      categoryIncreases: [],
      categoryDecreases: [],
      thisMonthSavingsRate: 10,
      lastMonthSavingsRate: 25,
      savingsRateDelta: -15,
    },
  });

  expect(result.supportingSignals).toContain('savings_rate_decline');
  expect(result.supportingData).toContainEqual({ label: 'Savings Rate', value: '-15 pts' });
});

// ---------------------------------------------------------------------------
// Scenario C — Goal forecast
// ---------------------------------------------------------------------------

test('Scenario C: 5 month forecast → goal_forecast signal with correct supportingData', () => {
  const result = buildFinancialSignals({
    goals: [{
      title: 'Laptop',
      progressPercent: 25,
      forecast: { projectedCompletionMonths: 5, confidence: 'medium' },
    }],
  });

  expect(result.supportingSignals).toContain('goal_forecast');
  expect(result.goals[0]).toMatchObject({ title: 'Laptop', progress: 25, forecastMonths: 5, forecastConfidence: 'medium' });
  expect(result.supportingData).toContainEqual({ label: 'Laptop Forecast', value: '~5 months' });
});

test('goal with null forecastMonths → no goal_forecast signal', () => {
  const result = buildFinancialSignals({
    goals: [{ title: 'Laptop', progressPercent: 25, forecast: { projectedCompletionMonths: null, confidence: null } }],
  });
  expect(result.supportingSignals).not.toContain('goal_forecast');
  expect(result.goals[0].forecastMonths).toBeNull();
});

test('goal already complete (forecastMonths = 0) → no goal_forecast signal', () => {
  const result = buildFinancialSignals({
    goals: [{ title: 'Laptop', progressPercent: 100, forecast: { projectedCompletionMonths: 0, confidence: 'high' } }],
  });
  expect(result.supportingSignals).not.toContain('goal_forecast');
});

// ---------------------------------------------------------------------------
// Scenario D — Missing data / no prior month
// ---------------------------------------------------------------------------

test('Scenario D: no prior month data → no trend signals generated', () => {
  const result = buildFinancialSignals({
    trends: {
      categoryIncreases: [],
      categoryDecreases: [],
      thisMonthSavingsRate: 25,
      lastMonthSavingsRate: null,
      savingsRateDelta: null,
    },
  });

  expect(result.supportingSignals).toHaveLength(0);
  expect(result.savingsRate).toBeNull();
  expect(result.spendingChanges).toHaveLength(0);
});

test('empty input → all fields null/empty, no signals', () => {
  const result = buildFinancialSignals({});
  expect(result.supportingSignals).toHaveLength(0);
  expect(result.supportingData).toHaveLength(0);
  expect(result.savingsRate).toBeNull();
  expect(result.spendingChanges).toHaveLength(0);
  expect(result.goals).toHaveLength(0);
  expect(result.consistency).toBeNull();
});

test('no arguments → returns valid empty structure without throwing', () => {
  const result = buildFinancialSignals();
  expect(result.supportingSignals).toEqual([]);
  expect(result.spendingChanges).toEqual([]);
});

// ---------------------------------------------------------------------------
// Spending decrease
// ---------------------------------------------------------------------------

test('spending decrease generates correct signal id and negative supportingData value', () => {
  const result = buildFinancialSignals({
    trends: {
      categoryIncreases: [],
      categoryDecreases: [{ name: 'Entertainment', pctChange: -25, thisMonthAmount: 30, lastMonthAmount: 40 }],
      thisMonthSavingsRate: null,
      lastMonthSavingsRate: null,
      savingsRateDelta: null,
    },
  });
  expect(result.supportingSignals).toContain('entertainment_spending_decrease');
  expect(result.supportingData).toContainEqual({ label: 'Entertainment Spending', value: '-25%' });
});

// ---------------------------------------------------------------------------
// Consistency
// ---------------------------------------------------------------------------

test('consistency: 12 active days → level "strong"', () => {
  const result = buildFinancialSignals({ consistency: { activeDaysThisMonth: 12 } });
  expect(result.consistency).toEqual({ activeDays: 12, level: 'strong' });
});

test('consistency: 2 active days → level "getting started"', () => {
  const result = buildFinancialSignals({ consistency: { activeDaysThisMonth: 2 } });
  expect(result.consistency).toMatchObject({ level: 'getting started' });
});

test('consistency: 0 active days → level "none"', () => {
  const result = buildFinancialSignals({ consistency: { activeDaysThisMonth: 0 } });
  expect(result.consistency).toMatchObject({ level: 'none' });
});

// ---------------------------------------------------------------------------
// Multiple signals combined
// ---------------------------------------------------------------------------

test('multiple signals combined → all signal ids and supportingData entries present', () => {
  const result = buildFinancialSignals({
    trends: {
      categoryIncreases: [{ name: 'Food', pctChange: 38, thisMonthAmount: 187, lastMonthAmount: 135 }],
      categoryDecreases: [],
      thisMonthSavingsRate: 31,
      lastMonthSavingsRate: 19,
      savingsRateDelta: 12,
    },
    goals: [{ title: 'Laptop', progressPercent: 25, forecast: { projectedCompletionMonths: 5, confidence: 'medium' } }],
  });

  expect(result.supportingSignals).toContain('food_spending_increase');
  expect(result.supportingSignals).toContain('savings_rate_improvement');
  expect(result.supportingSignals).toContain('goal_forecast');
  expect(result.supportingData).toHaveLength(3);
});

// ---------------------------------------------------------------------------
// Scenario E — Structure validation
// ---------------------------------------------------------------------------

test('Scenario E: result always contains all required top-level keys', () => {
  const result = buildFinancialSignals({});
  expect(result).toHaveProperty('savingsRate');
  expect(result).toHaveProperty('spendingChanges');
  expect(result).toHaveProperty('consistency');
  expect(result).toHaveProperty('goals');
  expect(result).toHaveProperty('supportingSignals');
  expect(result).toHaveProperty('supportingData');
});
