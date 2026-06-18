import {
  buildFinancialReview,
  generateFinancialReview,
  computeReviewProgress,
} from '../lib/financialReviews.js';

// ---------------------------------------------------------------------------
// buildFinancialReview
// ---------------------------------------------------------------------------

test('Scenario A: savings_rate_improvement signal → wins contains "Savings rate improved"', () => {
  const result = buildFinancialReview({
    signals: {
      supportingSignals: ['savings_rate_improvement'],
      spendingChanges: [],
    },
  });
  expect(result.wins).toContain('Savings rate improved');
  expect(result.concerns).toHaveLength(0);
});

test('Scenario B: food spending pctChange > 0 → concerns contains spending issue', () => {
  const result = buildFinancialReview({
    signals: {
      supportingSignals: [],
      spendingChanges: [{ category: 'Food', pctChange: 38, currentAmount: 187, previousAmount: 135 }],
    },
  });
  expect(result.concerns.some(c => c.toLowerCase().includes('food'))).toBe(true);
  expect(result.concerns.some(c => c.toLowerCase().includes('increased'))).toBe(true);
});

test('Scenario C: financialAction with status completed → completedActions = 1', () => {
  const result = buildFinancialReview({
    actions: [
      { actionId: 'reduce_food_spending', status: 'completed' },
      { actionId: 'maintain_tracking_habit', status: 'active' },
    ],
  });
  expect(result.completedActions).toBe(1);
});

test('Scenario D: active strategy with percentComplete < 100 → activeStrategies = 1', () => {
  const result = buildFinancialReview({
    strategies: [
      { id: 'accelerate_laptop', title: 'Accelerate Laptop', progress: { completedActions: 1, totalActions: 2, percentComplete: 50 } },
    ],
  });
  expect(result.activeStrategies).toBe(1);
});

test('Scenario E: no signals, alerts, or memory → empty wins and concerns (no fabricated data)', () => {
  const result = buildFinancialReview({});
  expect(result.wins).toHaveLength(0);
  expect(result.concerns).toHaveLength(0);
  expect(result.topOpportunity).toBeNull();
});

test('buildFinancialReview: period field returned in output', () => {
  const monthly = buildFinancialReview({ period: 'monthly' });
  expect(monthly.period).toBe('monthly');

  const weekly = buildFinancialReview({ period: 'weekly' });
  expect(weekly.period).toBe('weekly');
});

test('buildFinancialReview: topOpportunity derived from largest spending increase', () => {
  const result = buildFinancialReview({
    signals: {
      supportingSignals: [],
      spendingChanges: [
        { category: 'Food', pctChange: 38, currentAmount: 187, previousAmount: 135 },
        { category: 'Dining', pctChange: 60, currentAmount: 120, previousAmount: 75 },
      ],
    },
  });
  expect(result.topOpportunity).toContain('dining');
});

test('buildFinancialReview: topOpportunity null when no spending increases or alerts', () => {
  const result = buildFinancialReview({
    signals: { supportingSignals: [], spendingChanges: [] },
    alerts: [],
  });
  expect(result.topOpportunity).toBeNull();
});

test('buildFinancialReview: positive alerts excluded from concerns', () => {
  const result = buildFinancialReview({
    alerts: [
      { id: 'strategy_completed', severity: 'high', tone: 'positive', title: 'Strategy completed', description: 'Accelerate Laptop completed.' },
      { id: 'food_spike', severity: 'medium', tone: 'warning', title: 'Food spike', description: 'Food spending elevated.' },
    ],
  });
  expect(result.concerns.some(c => c.includes('Accelerate Laptop'))).toBe(false);
  expect(result.concerns.some(c => c.includes('Food spending elevated'))).toBe(true);
});

test('buildFinancialReview: worsening memory patterns → concerns', () => {
  const result = buildFinancialReview({
    memory: { worseningPatterns: ['dining_spend'], improvingPatterns: [], resolvedAlerts: [] },
  });
  expect(result.concerns.some(c => c.includes('dining spend'))).toBe(true);
  expect(result.concerns.some(c => c.includes('worsening'))).toBe(true);
});

test('buildFinancialReview: improving memory patterns → wins (non-savings-rate)', () => {
  const result = buildFinancialReview({
    memory: { improvingPatterns: ['dining_spend'], worseningPatterns: [], resolvedAlerts: [] },
  });
  expect(result.wins.some(w => w.includes('dining spend'))).toBe(true);
});

test('buildFinancialReview: resolved alerts → wins', () => {
  const result = buildFinancialReview({
    memory: { resolvedAlerts: ['food_spike'], improvingPatterns: [], worseningPatterns: [] },
  });
  expect(result.wins.some(w => w.includes('food spike'))).toBe(true);
  expect(result.wins.some(w => w.includes('Previous concern resolved'))).toBe(true);
});

test('buildFinancialReview: spending decrease → wins', () => {
  const result = buildFinancialReview({
    signals: {
      supportingSignals: [],
      spendingChanges: [{ category: 'Food', pctChange: -20, currentAmount: 108, previousAmount: 135 }],
    },
  });
  expect(result.wins.some(w => w.includes('Food') && w.includes('decreased'))).toBe(true);
});

test('buildFinancialReview: strategy at 100% does not count as active', () => {
  const result = buildFinancialReview({
    strategies: [
      { id: 'accelerate_laptop', title: 'Done', progress: { completedActions: 2, totalActions: 2, percentComplete: 100 } },
    ],
  });
  expect(result.activeStrategies).toBe(0);
});

test('buildFinancialReview: weekly period + 5+ active days → win added', () => {
  const result = buildFinancialReview({
    signals: {
      supportingSignals: [],
      spendingChanges: [],
      consistency: { activeDays: 6, level: 'strong' },
    },
    period: 'weekly',
  });
  expect(result.wins.some(w => w.includes('Logged expenses on 6 days'))).toBe(true);
});

test('buildFinancialReview: weekly period + fewer than 5 active days → no consistency win', () => {
  const result = buildFinancialReview({
    signals: {
      supportingSignals: [],
      spendingChanges: [],
      consistency: { activeDays: 3, level: 'building' },
    },
    period: 'weekly',
  });
  expect(result.wins.some(w => w.includes('Logged expenses'))).toBe(false);
});

// ---------------------------------------------------------------------------
// buildFinancialReview: roadmap integration (Part 6)
// ---------------------------------------------------------------------------

test('buildFinancialReview: no roadmap → roadmapProgress is null', () => {
  const result = buildFinancialReview({});
  expect(result.roadmapProgress).toBeNull();
});

test('buildFinancialReview: roadmap with completed and upcoming milestones → roadmapProgress populated', () => {
  const roadmap = {
    milestones: [
      { id: 'save_25', title: 'Reach 25%', completed: true },
      { id: 'save_50', title: 'Reach 50%', completed: false },
    ],
  };
  const result = buildFinancialReview({ roadmap });
  expect(result.roadmapProgress).not.toBeNull();
  expect(result.roadmapProgress.completedMilestone).toBe('Reach 25%');
  expect(result.roadmapProgress.upcomingMilestone).toBe('Reach 50%');
});

test('buildFinancialReview: roadmap all milestones completed → completedMilestone is last title, upcomingMilestone is null', () => {
  const roadmap = {
    milestones: [
      { id: 'save_25', title: 'Reach 25%', completed: true },
      { id: 'save_50', title: 'Reach 50%', completed: true },
      { id: 'save_75', title: 'Reach 75%', completed: true },
      { id: 'save_100', title: 'Goal Complete', completed: true },
    ],
  };
  const result = buildFinancialReview({ roadmap });
  expect(result.roadmapProgress.completedMilestone).toBe('Goal Complete');
  expect(result.roadmapProgress.upcomingMilestone).toBeNull();
});

test('buildFinancialReview: roadmap with empty milestones → roadmapProgress with nulls', () => {
  const roadmap = { milestones: [] };
  const result = buildFinancialReview({ roadmap });
  expect(result.roadmapProgress).not.toBeNull();
  expect(result.roadmapProgress.completedMilestone).toBeNull();
  expect(result.roadmapProgress.upcomingMilestone).toBeNull();
});

// ---------------------------------------------------------------------------
// computeReviewProgress
// ---------------------------------------------------------------------------

test('computeReviewProgress: previous concern resolved → { resolved: true }', () => {
  const previousReview = { concerns: ['Food spending increased'] };
  const currentReview = { concerns: [] };
  const result = computeReviewProgress(currentReview, previousReview);
  expect(result.resolved).toBe(true);
});

test('computeReviewProgress: previous concern still present → { resolved: false }', () => {
  const previousReview = { concerns: ['Food spending increased'] };
  const currentReview = { concerns: ['Food spending increased'] };
  const result = computeReviewProgress(currentReview, previousReview);
  expect(result.resolved).toBe(false);
});

test('computeReviewProgress: no previous concerns → { resolved: false }', () => {
  const result = computeReviewProgress({ concerns: ['Food spending increased'] }, { concerns: [] });
  expect(result.resolved).toBe(false);
});

test('computeReviewProgress: null inputs → { resolved: false }', () => {
  expect(computeReviewProgress(null, null)).toEqual({ resolved: false });
});

test('computeReviewProgress: undefined inputs → { resolved: false }', () => {
  expect(computeReviewProgress(undefined, undefined)).toEqual({ resolved: false });
});

// ---------------------------------------------------------------------------
// generateFinancialReview
// ---------------------------------------------------------------------------

test('generateFinancialReview: returns wins, concerns, actions, opportunities, strategies', () => {
  const result = generateFinancialReview({});
  expect(Array.isArray(result.wins)).toBe(true);
  expect(Array.isArray(result.concerns)).toBe(true);
  expect(Array.isArray(result.actions)).toBe(true);
  expect(Array.isArray(result.opportunities)).toBe(true);
  expect(Array.isArray(result.strategies)).toBe(true);
});

test('generateFinancialReview: filters actions to active and completed only', () => {
  const result = generateFinancialReview({
    actions: [
      { actionId: 'reduce_food_spending', title: 'Reduce food spending', status: 'active' },
      { actionId: 'increase_goal_contributions', title: 'Increase contributions', status: 'completed' },
      { actionId: 'maintain_tracking_habit', title: 'Track habit', status: 'dismissed' },
    ],
  });
  expect(result.actions).toHaveLength(2);
  expect(result.actions.every(a => ['active', 'completed'].includes(a.status))).toBe(true);
});

test('generateFinancialReview: maps strategies to id/title/progress shape', () => {
  const result = generateFinancialReview({
    strategies: [{
      id: 'accelerate_laptop',
      title: 'Accelerate Laptop',
      priorityScore: 85,
      progress: { completedActions: 1, totalActions: 2, percentComplete: 50 },
    }],
  });
  expect(result.strategies[0]).toMatchObject({ id: 'accelerate_laptop', title: 'Accelerate Laptop' });
  expect(result.strategies[0]).not.toHaveProperty('priorityScore');
});

test('generateFinancialReview: topOpportunity appears in opportunities array', () => {
  const result = generateFinancialReview({
    signals: {
      supportingSignals: [],
      spendingChanges: [{ category: 'Food', pctChange: 38, currentAmount: 187, previousAmount: 135 }],
    },
  });
  expect(result.opportunities.length).toBeGreaterThan(0);
  expect(result.opportunities[0]).toContain('food');
});

test('generateFinancialReview: empty inputs → valid empty structure with no errors', () => {
  const result = generateFinancialReview();
  expect(result).toMatchObject({
    wins: [],
    concerns: [],
    actions: [],
    opportunities: [],
    strategies: [],
  });
});
