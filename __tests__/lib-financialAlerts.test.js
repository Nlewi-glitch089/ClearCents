import { buildFinancialAlerts } from '../lib/financialAlerts.js';

function makeSignals({ spendingChanges = [], savingsRateDelta = null, thisMonthSavingsRate = null, lastMonthSavingsRate = null } = {}) {
  return {
    savingsRate: savingsRateDelta != null ? { current: thisMonthSavingsRate, previous: lastMonthSavingsRate, delta: savingsRateDelta } : null,
    spendingChanges,
    consistency: null,
    goals: [],
    supportingSignals: [],
    supportingData: [],
  };
}

function makeGoal({ title = 'Laptop', status = 'active', milestones = {} } = {}) {
  return { title, status, milestones: { reached25: false, reached50: false, reached75: false, completed: false, ...milestones } };
}

// ---------------------------------------------------------------------------
// Scenario A — Spending spike
// ---------------------------------------------------------------------------

test('Scenario A: food +38% → food_spike alert, severity medium', () => {
  const signals = makeSignals({ spendingChanges: [{ category: 'Food', pctChange: 38, currentAmount: 187, previousAmount: 135 }] });
  const { alerts } = buildFinancialAlerts({ signals });

  expect(alerts).toHaveLength(1);
  expect(alerts[0].id).toBe('food_spike');
  expect(alerts[0].severity).toBe('medium');
  expect(alerts[0].title).toBe('Food spending increased');
  expect(alerts[0].description).toContain('38%');
});

test('spending spike >= 50% → severity high', () => {
  const signals = makeSignals({ spendingChanges: [{ category: 'Food', pctChange: 55, currentAmount: 210, previousAmount: 135 }] });
  const { alerts } = buildFinancialAlerts({ signals });

  expect(alerts[0].severity).toBe('high');
});

test('spending increase < 25% → no alert generated', () => {
  const signals = makeSignals({ spendingChanges: [{ category: 'Food', pctChange: 20, currentAmount: 162, previousAmount: 135 }] });
  const { alerts } = buildFinancialAlerts({ signals });

  expect(alerts).toHaveLength(0);
});

test('spending decrease → no alert (only increases trigger spikes)', () => {
  const signals = makeSignals({ spendingChanges: [{ category: 'Food', pctChange: -30, currentAmount: 94, previousAmount: 135 }] });
  const { alerts } = buildFinancialAlerts({ signals });

  expect(alerts).toHaveLength(0);
});

test('spike alert id uses lowercase underscore from category name', () => {
  const signals = makeSignals({ spendingChanges: [{ category: 'Dining Out', pctChange: 30, currentAmount: 100, previousAmount: 77 }] });
  const { alerts } = buildFinancialAlerts({ signals });

  expect(alerts[0].id).toBe('dining_out_spike');
});

// ---------------------------------------------------------------------------
// Scenario B — Savings rate
// ---------------------------------------------------------------------------

test('Scenario B: savings rate +12 pts → savings_improvement, severity medium', () => {
  const signals = makeSignals({ savingsRateDelta: 12, thisMonthSavingsRate: 31, lastMonthSavingsRate: 19 });
  const { alerts } = buildFinancialAlerts({ signals });

  expect(alerts).toHaveLength(1);
  expect(alerts[0].id).toBe('savings_improvement');
  expect(alerts[0].severity).toBe('medium');
  expect(alerts[0].description).toContain('12');
});

test('savings rate -12 pts → savings_decline, severity medium', () => {
  const signals = makeSignals({ savingsRateDelta: -12, thisMonthSavingsRate: 10, lastMonthSavingsRate: 22 });
  const { alerts } = buildFinancialAlerts({ signals });

  expect(alerts[0].id).toBe('savings_decline');
  expect(alerts[0].severity).toBe('medium');
});

test('savings rate -25 pts → savings_decline, severity high', () => {
  const signals = makeSignals({ savingsRateDelta: -25, thisMonthSavingsRate: 0, lastMonthSavingsRate: 25 });
  const { alerts } = buildFinancialAlerts({ signals });

  expect(alerts[0].id).toBe('savings_decline');
  expect(alerts[0].severity).toBe('high');
});

test('savings rate change within -10..+10 → no alert', () => {
  const signals = makeSignals({ savingsRateDelta: 5, thisMonthSavingsRate: 25, lastMonthSavingsRate: 20 });
  const { alerts } = buildFinancialAlerts({ signals });

  expect(alerts).toHaveLength(0);
});

test('no prior month savings data (savingsRate null) → no alert', () => {
  const signals = makeSignals();
  const { alerts } = buildFinancialAlerts({ signals });

  expect(alerts).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Scenario C — Goal milestone
// ---------------------------------------------------------------------------

test('Scenario C: goal at 50% → goal_milestone alert with correct description', () => {
  const goals = [makeGoal({ milestones: { reached25: true, reached50: true, reached75: false, completed: false } })];
  const { alerts } = buildFinancialAlerts({ goals });

  expect(alerts).toHaveLength(1);
  expect(alerts[0].id).toBe('goal_milestone');
  expect(alerts[0].severity).toBe('medium');
  expect(alerts[0].description).toContain('50%');
  expect(alerts[0].description).toContain('Laptop');
});

test('goal at 25% → 25% milestone description', () => {
  const goals = [makeGoal({ milestones: { reached25: true, reached50: false, reached75: false, completed: false } })];
  const { alerts } = buildFinancialAlerts({ goals });

  expect(alerts[0].description).toContain('25%');
});

test('goal at 75% → 75% milestone description (shows highest threshold)', () => {
  const goals = [makeGoal({ milestones: { reached25: true, reached50: true, reached75: true, completed: false } })];
  const { alerts } = buildFinancialAlerts({ goals });

  expect(alerts[0].description).toContain('75%');
});

test('goal at 0% (no milestones reached) → no alert', () => {
  const goals = [makeGoal({ milestones: { reached25: false, reached50: false, reached75: false, completed: false } })];
  const { alerts } = buildFinancialAlerts({ goals });

  expect(alerts).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Scenario D — Goal completion
// ---------------------------------------------------------------------------

test('Scenario D: goal.status === completed → goal_completed alert, severity high', () => {
  const goals = [makeGoal({ status: 'completed', milestones: { reached25: true, reached50: true, reached75: true, completed: true } })];
  const { alerts } = buildFinancialAlerts({ goals });

  expect(alerts).toHaveLength(1);
  expect(alerts[0].id).toBe('goal_completed');
  expect(alerts[0].severity).toBe('high');
  expect(alerts[0].description).toContain('Laptop');
});

test('goal_completed fires instead of goal_milestone when goal is done', () => {
  const goals = [makeGoal({ status: 'completed', milestones: { reached25: true, reached50: true, reached75: true, completed: true } })];
  const { alerts } = buildFinancialAlerts({ goals });

  expect(alerts.some(a => a.id === 'goal_milestone')).toBe(false);
  expect(alerts.some(a => a.id === 'goal_completed')).toBe(true);
});

// ---------------------------------------------------------------------------
// Scenario E — No significant changes
// ---------------------------------------------------------------------------

test('Scenario E: no significant changes → empty alerts array', () => {
  const { alerts } = buildFinancialAlerts({
    signals: makeSignals({ savingsRateDelta: 3 }),
    goals: [makeGoal({ milestones: {} })],
  });

  expect(alerts).toHaveLength(0);
});

test('no input → empty alerts, no crash', () => {
  const { alerts } = buildFinancialAlerts();
  expect(alerts).toEqual([]);
});

// ---------------------------------------------------------------------------
// Sorting and limit
// ---------------------------------------------------------------------------

test('alerts sorted: high before medium', () => {
  const signals = makeSignals({
    savingsRateDelta: 12,
    thisMonthSavingsRate: 31,
    lastMonthSavingsRate: 19,
    spendingChanges: [{ category: 'Food', pctChange: 60, currentAmount: 200, previousAmount: 125 }],
  });
  const { alerts } = buildFinancialAlerts({ signals });

  expect(alerts[0].severity).toBe('high');
  expect(alerts[1].severity).toBe('medium');
});

test('limited to top 3 alerts', () => {
  const signals = makeSignals({
    savingsRateDelta: -25,
    thisMonthSavingsRate: 0,
    lastMonthSavingsRate: 25,
    spendingChanges: [
      { category: 'Food', pctChange: 60, currentAmount: 200, previousAmount: 125 },
      { category: 'Transport', pctChange: 30, currentAmount: 90, previousAmount: 69 },
    ],
  });
  const goals = [makeGoal({ status: 'completed', milestones: { reached25: true, reached50: true, reached75: true, completed: true } })];
  const { alerts } = buildFinancialAlerts({ signals, goals });

  expect(alerts.length).toBeLessThanOrEqual(3);
});

// ---------------------------------------------------------------------------
// Structure validation
// ---------------------------------------------------------------------------

test('each alert has required fields: id, severity, tone, title, description', () => {
  const signals = makeSignals({ spendingChanges: [{ category: 'Food', pctChange: 40, currentAmount: 189, previousAmount: 135 }] });
  const { alerts } = buildFinancialAlerts({ signals });

  for (const a of alerts) {
    expect(a).toHaveProperty('id');
    expect(a).toHaveProperty('severity');
    expect(a).toHaveProperty('tone');
    expect(a).toHaveProperty('title');
    expect(a).toHaveProperty('description');
  }
});
