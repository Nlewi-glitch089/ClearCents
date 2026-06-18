import { buildActionPlans, computeActionPriority, evaluateActionOutcome } from '../lib/actionPlans.js';

// ---------------------------------------------------------------------------
// computeActionPriority
// ---------------------------------------------------------------------------

test('easy difficulty adds 10 to impactScore', () => {
  expect(computeActionPriority({ impactScore: 60, difficulty: 'easy' })).toBe(70);
});

test('hard difficulty subtracts 10 from impactScore', () => {
  expect(computeActionPriority({ impactScore: 60, difficulty: 'hard' })).toBe(50);
});

test('medium difficulty (default) has no adjustment', () => {
  expect(computeActionPriority({ impactScore: 60 })).toBe(60);
});

test('goalImpact adds 10 to the score', () => {
  expect(computeActionPriority({ impactScore: 60, goalImpact: true })).toBe(70);
});

test('combined adjustments are capped at 100', () => {
  expect(computeActionPriority({ impactScore: 100, difficulty: 'easy', goalImpact: true })).toBe(100);
});

// ---------------------------------------------------------------------------
// Scenario A — spending reduction action
// ---------------------------------------------------------------------------

const FOOD_OPP = {
  id: 'reduce_food_spending',
  category: 'spending',
  impactScore: 65,
  confidence: 'high',
  title: 'Reduce food spending',
  description: 'Food spending elevated.',
};

test('Scenario A: generates spending reduction action for reduce_food_spending opportunity', () => {
  const { plans } = buildActionPlans({ opportunities: [FOOD_OPP] });
  expect(plans).toHaveLength(1);
  expect(plans[0].id).toBe('reduce_food_spending');
});

test('Scenario A: spending action description is "Lower monthly food spending by $100."', () => {
  const { plans } = buildActionPlans({ opportunities: [FOOD_OPP] });
  expect(plans[0].description).toBe('Lower monthly food spending by $100.');
});

test('Scenario A: spending action has difficulty medium', () => {
  const { plans } = buildActionPlans({ opportunities: [FOOD_OPP] });
  expect(plans[0].difficulty).toBe('medium');
});

test('Scenario A: spending action has estimatedMonthlyBenefit of 100', () => {
  const { plans } = buildActionPlans({ opportunities: [FOOD_OPP] });
  expect(plans[0].estimatedMonthlyBenefit).toBe(100);
});

test('Scenario A: spending action priorityScore includes goal bonus when goals present', () => {
  const withGoal = buildActionPlans({
    opportunities: [FOOD_OPP],
    goals: [{ id: 'g1', title: 'Laptop' }],
  });
  const withoutGoal = buildActionPlans({ opportunities: [FOOD_OPP], goals: [] });
  expect(withGoal.plans[0].priorityScore).toBeGreaterThan(withoutGoal.plans[0].priorityScore);
});

// ---------------------------------------------------------------------------
// Scenario B — goal acceleration action
// ---------------------------------------------------------------------------

const GOAL_OPP = {
  id: 'goal_acceleration',
  category: 'goal',
  impactScore: 57,
  confidence: 'medium',
  title: 'Accelerate Laptop goal',
  description: 'Laptop completes in 5 months.',
};

test('Scenario B: generates goal acceleration action for goal_acceleration opportunity', () => {
  const { plans } = buildActionPlans({ opportunities: [GOAL_OPP] });
  expect(plans).toHaveLength(1);
  expect(plans[0].id).toBe('goal_acceleration');
});

test('Scenario B: goal action description is "Increase monthly contributions by $50."', () => {
  const { plans } = buildActionPlans({ opportunities: [GOAL_OPP] });
  expect(plans[0].description).toBe('Increase monthly contributions by $50.');
});

test('Scenario B: goal action has estimatedMonthlyBenefit of 50', () => {
  const { plans } = buildActionPlans({ opportunities: [GOAL_OPP] });
  expect(plans[0].estimatedMonthlyBenefit).toBe(50);
});

test('Scenario B: goal action always uses goalImpact true regardless of goals array', () => {
  const withGoal = buildActionPlans({ opportunities: [GOAL_OPP], goals: [{ id: 'g1', title: 'Laptop' }] });
  const withoutGoal = buildActionPlans({ opportunities: [GOAL_OPP], goals: [] });
  // Both should use goalImpact = true for goal_acceleration (it is inherently goal-related)
  expect(withGoal.plans[0].priorityScore).toBe(withoutGoal.plans[0].priorityScore);
});

// ---------------------------------------------------------------------------
// Savings improvement action
// ---------------------------------------------------------------------------

const SAVINGS_OPP = {
  id: 'increase_goal_contributions',
  category: 'savings',
  impactScore: 50,
  confidence: 'medium',
  title: 'Increase goal contributions',
  description: 'Your savings rate improved.',
};

test('generates savings improvement action for increase_goal_contributions opportunity', () => {
  const { plans } = buildActionPlans({ opportunities: [SAVINGS_OPP] });
  expect(plans[0].id).toBe('increase_goal_contributions');
});

test('savings action description mentions transfer and $50', () => {
  const { plans } = buildActionPlans({ opportunities: [SAVINGS_OPP] });
  expect(plans[0].description).toContain('transfer');
  expect(plans[0].description).toContain('$50');
});

test('savings action has difficulty easy', () => {
  const { plans } = buildActionPlans({ opportunities: [SAVINGS_OPP] });
  expect(plans[0].difficulty).toBe('easy');
});

// ---------------------------------------------------------------------------
// Habit reinforcement action
// ---------------------------------------------------------------------------

const HABIT_OPP = {
  id: 'maintain_tracking_habit',
  category: 'habit',
  impactScore: 30,
  confidence: 'high',
  title: 'Maintain tracking habit',
  description: 'Consistent tracking for 3 periods.',
};

test('generates habit action for maintain_tracking_habit opportunity', () => {
  const { plans } = buildActionPlans({ opportunities: [HABIT_OPP] });
  expect(plans[0].id).toBe('maintain_tracking_habit');
  expect(plans[0].description).toBe('Maintain current tracking behavior.');
});

test('habit action has estimatedMonthlyBenefit of 0', () => {
  const { plans } = buildActionPlans({ opportunities: [HABIT_OPP] });
  expect(plans[0].estimatedMonthlyBenefit).toBe(0);
});

// ---------------------------------------------------------------------------
// Scenario C — sorting by priorityScore
// ---------------------------------------------------------------------------

test('Scenario C: plans are sorted by priorityScore descending', () => {
  const { plans } = buildActionPlans({
    opportunities: [HABIT_OPP, FOOD_OPP, GOAL_OPP],
    goals: [{ id: 'g1', title: 'Laptop' }],
  });
  for (let i = 1; i < plans.length; i++) {
    expect(plans[i - 1].priorityScore).toBeGreaterThanOrEqual(plans[i].priorityScore);
  }
});

test('Scenario C: higher-impactScore opportunity appears first after sorting', () => {
  const highOpp = { ...FOOD_OPP, impactScore: 80 };
  const lowOpp = { ...HABIT_OPP, impactScore: 20 };
  const { plans } = buildActionPlans({ opportunities: [lowOpp, highOpp] });
  expect(plans[0].id).toBe('reduce_food_spending');
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

test('returns empty plans for empty opportunities array', () => {
  const { plans } = buildActionPlans({ opportunities: [] });
  expect(plans).toEqual([]);
});

test('unrecognized opportunity ids are skipped', () => {
  const { plans } = buildActionPlans({
    opportunities: [{ id: 'unknown_action', impactScore: 90, title: 'Unknown', description: 'X' }],
  });
  expect(plans).toHaveLength(0);
});

test('null entries in opportunities are skipped without error', () => {
  const { plans } = buildActionPlans({
    opportunities: [null, FOOD_OPP, undefined],
  });
  expect(plans).toHaveLength(1);
  expect(plans[0].id).toBe('reduce_food_spending');
});

// ---------------------------------------------------------------------------
// Scenario E — evaluateActionOutcome: spending
// ---------------------------------------------------------------------------

test('Scenario E: spending reduction — success when amount decreases', () => {
  const result = evaluateActionOutcome({
    actionId: 'reduce_food_spending',
    beforeMetrics: { amount: 300 },
    afterMetrics: { amount: 210 },
  });
  expect(result.success).toBe(true);
  expect(result.metric).toBe('spending_reduction');
});

test('Scenario E: spending reduction — failure when amount increases', () => {
  const result = evaluateActionOutcome({
    actionId: 'reduce_food_spending',
    beforeMetrics: { amount: 200 },
    afterMetrics: { amount: 250 },
  });
  expect(result.success).toBe(false);
});

test('Scenario E: spending reduction — improvement equals the amount saved', () => {
  const result = evaluateActionOutcome({
    actionId: 'reduce_food_spending',
    beforeMetrics: { amount: 300 },
    afterMetrics: { amount: 210 },
  });
  expect(result.improvement).toBe(90);
});

// ---------------------------------------------------------------------------
// evaluateActionOutcome: goal acceleration
// ---------------------------------------------------------------------------

test('goal acceleration — success when projected months decrease', () => {
  const result = evaluateActionOutcome({
    actionId: 'goal_acceleration',
    beforeMetrics: { projectedCompletionMonths: 5 },
    afterMetrics: { projectedCompletionMonths: 4 },
  });
  expect(result.success).toBe(true);
  expect(result.metric).toBe('forecast_improvement');
  expect(result.improvement).toBe(1);
});

test('goal acceleration — failure when projected months increase', () => {
  const result = evaluateActionOutcome({
    actionId: 'goal_acceleration',
    beforeMetrics: { projectedCompletionMonths: 4 },
    afterMetrics: { projectedCompletionMonths: 6 },
  });
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// evaluateActionOutcome: unknown / habit
// ---------------------------------------------------------------------------

test('unknown actionId returns success false and metric unknown', () => {
  const result = evaluateActionOutcome({ actionId: 'something_else', beforeMetrics: {}, afterMetrics: {} });
  expect(result.success).toBe(false);
  expect(result.metric).toBe('unknown');
});

test('habit continuation — success when streak stays the same', () => {
  const result = evaluateActionOutcome({
    actionId: 'maintain_tracking_habit',
    beforeMetrics: { streak: 3 },
    afterMetrics: { streak: 3 },
  });
  expect(result.success).toBe(true);
  expect(result.metric).toBe('habit_continuation');
});

// ---------------------------------------------------------------------------
// Structure validation
// ---------------------------------------------------------------------------

test('plan has all required fields', () => {
  const { plans } = buildActionPlans({ opportunities: [FOOD_OPP] });
  const plan = plans[0];
  expect(plan).toHaveProperty('id');
  expect(plan).toHaveProperty('title');
  expect(plan).toHaveProperty('description');
  expect(plan).toHaveProperty('impactScore');
  expect(plan).toHaveProperty('estimatedMonthlyBenefit');
  expect(plan).toHaveProperty('difficulty');
  expect(plan).toHaveProperty('priorityScore');
});

test('evaluateActionOutcome result has required fields', () => {
  const result = evaluateActionOutcome({ actionId: 'reduce_food_spending', beforeMetrics: { amount: 100 }, afterMetrics: { amount: 80 } });
  expect(result).toHaveProperty('success');
  expect(result).toHaveProperty('improvement');
  expect(result).toHaveProperty('metric');
});
