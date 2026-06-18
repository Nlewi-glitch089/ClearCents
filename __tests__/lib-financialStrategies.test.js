import {
  computeStrategyScore,
  buildStrategyProgress,
  buildStrategyCompletionAlerts,
  evaluateStrategyOutcome,
  buildFinancialStrategies,
} from '../lib/financialStrategies.js';

// ---------------------------------------------------------------------------
// computeStrategyScore
// ---------------------------------------------------------------------------

test('computeStrategyScore: high benefit + goal + single action + high confidence = 90', () => {
  // benefitScore = min(floor(120/2),60) = 60, goal = +20, actions = 0 penalty, high = +10 → 90
  expect(computeStrategyScore({ totalBenefit: 120, goalImpact: true, actionCount: 1, confidence: 'high' })).toBe(90);
});

test('computeStrategyScore: zero inputs = 0', () => {
  expect(computeStrategyScore({ totalBenefit: 0, goalImpact: false, actionCount: 1, confidence: 'medium' })).toBe(0);
});

test('computeStrategyScore: benefit capped at 60 pts', () => {
  // totalBenefit = 300 → floor(300/2)=150 → capped at 60
  expect(computeStrategyScore({ totalBenefit: 300, goalImpact: false, actionCount: 1, confidence: 'medium' })).toBe(60);
});

test('computeStrategyScore: multi-action penalty applied', () => {
  // 60 + 0 - (3-1)*5 + 0 = 50
  expect(computeStrategyScore({ totalBenefit: 300, goalImpact: false, actionCount: 3, confidence: 'medium' })).toBe(50);
});

test('computeStrategyScore: low confidence applies -10', () => {
  // 60 + 0 - 0 - 10 = 50
  expect(computeStrategyScore({ totalBenefit: 300, goalImpact: false, actionCount: 1, confidence: 'low' })).toBe(50);
});

test('computeStrategyScore: score does not exceed 100 (ceiling enforced)', () => {
  // formula max = 60 (benefit) + 20 (goal) + 10 (high) = 90; never exceeds 100
  const score = computeStrategyScore({ totalBenefit: 1000, goalImpact: true, actionCount: 1, confidence: 'high' });
  expect(score).toBeLessThanOrEqual(100);
  expect(score).toBe(90);
});

// ---------------------------------------------------------------------------
// buildStrategyProgress
// ---------------------------------------------------------------------------

const BASE_STRATEGY = {
  id: 'accelerate_laptop',
  title: 'Accelerate Laptop',
  actions: ['reduce_food_spending', 'increase_goal_contributions'],
  actionTitles: ['Reduce food spending', 'Increase goal contributions'],
};

test('Scenario B: one of two actions completed → 50% progress', () => {
  const financialActions = [
    { actionId: 'reduce_food_spending', status: 'completed' },
    { actionId: 'increase_goal_contributions', status: 'active' },
  ];
  const result = buildStrategyProgress(BASE_STRATEGY, financialActions);
  expect(result.completedActions).toBe(1);
  expect(result.totalActions).toBe(2);
  expect(result.percentComplete).toBe(50);
});

test('buildStrategyProgress: all actions completed → 100%', () => {
  const financialActions = [
    { actionId: 'reduce_food_spending', status: 'completed' },
    { actionId: 'increase_goal_contributions', status: 'completed' },
  ];
  const result = buildStrategyProgress(BASE_STRATEGY, financialActions);
  expect(result.completedActions).toBe(2);
  expect(result.percentComplete).toBe(100);
});

test('buildStrategyProgress: no completed actions → 0%', () => {
  const financialActions = [
    { actionId: 'reduce_food_spending', status: 'active' },
  ];
  const result = buildStrategyProgress(BASE_STRATEGY, financialActions);
  expect(result.completedActions).toBe(0);
  expect(result.percentComplete).toBe(0);
});

test('buildStrategyProgress: empty financialActions → 0%', () => {
  const result = buildStrategyProgress(BASE_STRATEGY, []);
  expect(result.completedActions).toBe(0);
  expect(result.totalActions).toBe(2);
  expect(result.percentComplete).toBe(0);
});

test('buildStrategyProgress: dismissed actions do not count as completed', () => {
  const financialActions = [
    { actionId: 'reduce_food_spending', status: 'dismissed' },
    { actionId: 'increase_goal_contributions', status: 'abandoned' },
  ];
  const result = buildStrategyProgress(BASE_STRATEGY, financialActions);
  expect(result.completedActions).toBe(0);
  expect(result.percentComplete).toBe(0);
});

// ---------------------------------------------------------------------------
// buildStrategyCompletionAlerts
// ---------------------------------------------------------------------------

test('Scenario C: all actions completed → strategy_completed alert generated', () => {
  const financialActions = [
    { actionId: 'reduce_food_spending', status: 'completed' },
    { actionId: 'increase_goal_contributions', status: 'completed' },
  ];
  const alerts = buildStrategyCompletionAlerts([BASE_STRATEGY], financialActions);
  expect(alerts).toHaveLength(1);
  expect(alerts[0].signalId).toBe('strategy_completed');
});

test('buildStrategyCompletionAlerts: partial completion → no alert', () => {
  const financialActions = [
    { actionId: 'reduce_food_spending', status: 'completed' },
  ];
  const alerts = buildStrategyCompletionAlerts([BASE_STRATEGY], financialActions);
  expect(alerts).toHaveLength(0);
});

test('buildStrategyCompletionAlerts: empty strategies → []', () => {
  expect(buildStrategyCompletionAlerts([], [])).toEqual([]);
});

test('buildStrategyCompletionAlerts: alert structure is correct', () => {
  const financialActions = [
    { actionId: 'reduce_food_spending', status: 'completed' },
    { actionId: 'increase_goal_contributions', status: 'completed' },
  ];
  const [alert] = buildStrategyCompletionAlerts([BASE_STRATEGY], financialActions);
  expect(alert.id).toBe('strategy_completed_accelerate_laptop');
  expect(alert.severity).toBe('high');
  expect(alert.tone).toBe('positive');
  expect(alert.title).toBe('Strategy completed');
  expect(alert.description).toContain('Accelerate Laptop');
});

test('buildStrategyCompletionAlerts: multiple strategies, only completed one generates alert', () => {
  const strategy2 = { id: 'savings_growth', title: 'Savings Growth Strategy', actions: ['maintain_tracking_habit'], actionTitles: ['Maintain tracking'] };
  const financialActions = [
    { actionId: 'reduce_food_spending', status: 'completed' },
    { actionId: 'increase_goal_contributions', status: 'completed' },
    { actionId: 'maintain_tracking_habit', status: 'active' },
  ];
  const alerts = buildStrategyCompletionAlerts([BASE_STRATEGY, strategy2], financialActions);
  expect(alerts).toHaveLength(1);
  expect(alerts[0].id).toBe('strategy_completed_accelerate_laptop');
});

// ---------------------------------------------------------------------------
// evaluateStrategyOutcome
// ---------------------------------------------------------------------------

test('Scenario E: accelerate strategy with improved forecast → success true', () => {
  const result = evaluateStrategyOutcome({
    strategyId: 'accelerate_laptop',
    beforeMetrics: { projectedCompletionMonths: 5 },
    afterMetrics: { projectedCompletionMonths: 3 },
  });
  expect(result.success).toBe(true);
  expect(result.improvement).toBe(2);
  expect(result.metric).toBe('projectedCompletionMonths');
});

test('evaluateStrategyOutcome: accelerate strategy with no improvement → success false', () => {
  const result = evaluateStrategyOutcome({
    strategyId: 'accelerate_laptop',
    beforeMetrics: { projectedCompletionMonths: 3 },
    afterMetrics: { projectedCompletionMonths: 5 },
  });
  expect(result.success).toBe(false);
  expect(result.improvement).toBe(-2);
});

test('evaluateStrategyOutcome: savings_growth with improved rate → success true', () => {
  const result = evaluateStrategyOutcome({
    strategyId: 'savings_growth',
    beforeMetrics: { savingsRate: 15 },
    afterMetrics: { savingsRate: 22 },
  });
  expect(result.success).toBe(true);
  expect(result.improvement).toBe(7);
  expect(result.metric).toBe('savingsRate');
});

test('evaluateStrategyOutcome: spending_recovery with lower spending → success true', () => {
  const result = evaluateStrategyOutcome({
    strategyId: 'spending_recovery',
    beforeMetrics: { totalSpending: 800 },
    afterMetrics: { totalSpending: 650 },
  });
  expect(result.success).toBe(true);
  expect(result.improvement).toBe(150);
  expect(result.metric).toBe('totalSpending');
});

test('evaluateStrategyOutcome: unknown strategyId → success false', () => {
  const result = evaluateStrategyOutcome({
    strategyId: 'mystery_strategy',
    beforeMetrics: {},
    afterMetrics: {},
  });
  expect(result.success).toBe(false);
  expect(result.improvement).toBe(0);
  expect(result.metric).toBeNull();
});

// ---------------------------------------------------------------------------
// buildFinancialStrategies
// ---------------------------------------------------------------------------

const FOOD_ACTION = { id: 'reduce_food_spending', title: 'Reduce food spending', estimatedMonthlyBenefit: 100, priorityScore: 75 };
const GOAL_ACTION = { id: 'increase_goal_contributions', title: 'Increase goal contributions', estimatedMonthlyBenefit: 50, priorityScore: 65 };
const DINING_ACTION = { id: 'reduce_dining_spending', title: 'Reduce dining spending', estimatedMonthlyBenefit: 80, priorityScore: 70 };
const HABIT_ACTION = { id: 'maintain_tracking_habit', title: 'Maintain tracking habit', estimatedMonthlyBenefit: 0, priorityScore: 30 };

const LAPTOP_GOAL = [{ id: 'g1', title: 'Laptop', targetAmount: 1200 }];

test('Scenario A: spending + goal actions → single Goal Acceleration strategy', () => {
  const result = buildFinancialStrategies({
    actions: [FOOD_ACTION, GOAL_ACTION],
    goals: LAPTOP_GOAL,
  });
  expect(result.strategies).toHaveLength(1);
  expect(result.strategies[0].title).toBe('Accelerate Laptop');
  expect(result.strategies[0].actions).toContain('reduce_food_spending');
  expect(result.strategies[0].actions).toContain('increase_goal_contributions');
});

test('Scenario A: strategy id is derived from goal name', () => {
  const result = buildFinancialStrategies({
    actions: [FOOD_ACTION, GOAL_ACTION],
    goals: LAPTOP_GOAL,
  });
  expect(result.strategies[0].id).toBe('accelerate_laptop');
});

test('Scenario D: only habit action → strategies = []', () => {
  const result = buildFinancialStrategies({ actions: [HABIT_ACTION] });
  expect(result.strategies).toHaveLength(0);
});

test('Scenario D: no actions → strategies = []', () => {
  const result = buildFinancialStrategies({ actions: [] });
  expect(result.strategies).toHaveLength(0);
});

test('Scenario D: single spending action, no goal or habit → no strategy (recovery needs 2+)', () => {
  const result = buildFinancialStrategies({ actions: [FOOD_ACTION] });
  expect(result.strategies).toHaveLength(0);
});

test('two spending actions, no goal or habit → Spending Recovery Strategy', () => {
  const result = buildFinancialStrategies({ actions: [FOOD_ACTION, DINING_ACTION] });
  expect(result.strategies).toHaveLength(1);
  expect(result.strategies[0].id).toBe('spending_recovery');
  expect(result.strategies[0].title).toBe('Spending Recovery Strategy');
});

test('spending + habit, no goal → Savings Growth Strategy', () => {
  const result = buildFinancialStrategies({ actions: [FOOD_ACTION, HABIT_ACTION] });
  expect(result.strategies).toHaveLength(1);
  expect(result.strategies[0].id).toBe('savings_growth');
  expect(result.strategies[0].title).toBe('Savings Growth Strategy');
});

test('Part 10: low success rate limits strategy to 1 action', () => {
  const actions = [FOOD_ACTION, DINING_ACTION, GOAL_ACTION];
  const result = buildFinancialStrategies({
    actions,
    goals: LAPTOP_GOAL,
    memory: { successRate: 30 },
  });
  expect(result.strategies[0].actions).toHaveLength(1);
});

test('Part 10: high success rate allows up to 3 actions', () => {
  const actions = [FOOD_ACTION, DINING_ACTION, GOAL_ACTION];
  const result = buildFinancialStrategies({
    actions,
    goals: LAPTOP_GOAL,
    memory: { successRate: 80 },
  });
  expect(result.strategies[0].actions.length).toBeGreaterThan(1);
});

test('buildFinancialStrategies: projected benefit sums action benefits', () => {
  const result = buildFinancialStrategies({
    actions: [FOOD_ACTION, GOAL_ACTION],
    goals: LAPTOP_GOAL,
  });
  const s = result.strategies[0];
  expect(s.projectedBenefit.monthly).toBe(150);
  expect(s.projectedBenefit.annual).toBe(1800);
});

test('buildFinancialStrategies: actionTitles matches selected actions', () => {
  const result = buildFinancialStrategies({
    actions: [FOOD_ACTION, GOAL_ACTION],
    goals: LAPTOP_GOAL,
  });
  expect(result.strategies[0].actionTitles).toContain('Reduce food spending');
  expect(result.strategies[0].actionTitles).toContain('Increase goal contributions');
});

test('buildFinancialStrategies: strategies sorted by priorityScore descending', () => {
  const result = buildFinancialStrategies({
    actions: [FOOD_ACTION, GOAL_ACTION],
    goals: LAPTOP_GOAL,
  });
  const scores = result.strategies.map(s => s.priorityScore);
  expect(scores).toEqual([...scores].sort((a, b) => b - a));
});
