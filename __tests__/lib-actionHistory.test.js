import {
  getActiveActionIds,
  suppressActiveOpportunities,
  buildActionHistoryContext,
  computeActionSuccessRate,
  buildCompletionAlerts,
} from '../lib/actionHistory.js';

// ---------------------------------------------------------------------------
// getActiveActionIds
// ---------------------------------------------------------------------------

test('returns actionIds for active actions only', () => {
  const actions = [
    { actionId: 'reduce_food_spending', status: 'active' },
    { actionId: 'goal_acceleration', status: 'completed' },
    { actionId: 'maintain_tracking_habit', status: 'dismissed' },
  ];
  expect(getActiveActionIds(actions)).toEqual(['reduce_food_spending']);
});

test('excludes completed and dismissed actions', () => {
  const actions = [
    { actionId: 'a', status: 'completed' },
    { actionId: 'b', status: 'dismissed' },
  ];
  expect(getActiveActionIds(actions)).toEqual([]);
});

test('returns empty array for empty input', () => {
  expect(getActiveActionIds([])).toEqual([]);
  expect(getActiveActionIds()).toEqual([]);
});

// ---------------------------------------------------------------------------
// suppressActiveOpportunities — Scenario C
// ---------------------------------------------------------------------------

test('Scenario C: removes opportunities that match an active actionId', () => {
  const opportunities = [
    { id: 'reduce_food_spending', impactScore: 70 },
    { id: 'goal_acceleration', impactScore: 55 },
  ];
  const result = suppressActiveOpportunities(opportunities, ['reduce_food_spending']);
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe('goal_acceleration');
});

test('Scenario C: keeps all opportunities when no active action IDs', () => {
  const opportunities = [
    { id: 'reduce_food_spending', impactScore: 70 },
    { id: 'goal_acceleration', impactScore: 55 },
  ];
  expect(suppressActiveOpportunities(opportunities, [])).toHaveLength(2);
});

test('returns all opportunities when activeActionIds is not provided', () => {
  const opportunities = [{ id: 'reduce_food_spending', impactScore: 70 }];
  expect(suppressActiveOpportunities(opportunities)).toHaveLength(1);
});

test('returns empty array when opportunities is empty', () => {
  expect(suppressActiveOpportunities([], ['reduce_food_spending'])).toEqual([]);
});

test('removes multiple opportunities that match multiple active IDs', () => {
  const opportunities = [
    { id: 'reduce_food_spending', impactScore: 70 },
    { id: 'goal_acceleration', impactScore: 55 },
    { id: 'maintain_tracking_habit', impactScore: 30 },
  ];
  const result = suppressActiveOpportunities(opportunities, ['reduce_food_spending', 'goal_acceleration']);
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe('maintain_tracking_habit');
});

// ---------------------------------------------------------------------------
// buildActionHistoryContext — Scenario E
// ---------------------------------------------------------------------------

test('Scenario E: separates accepted, completed, and dismissed by status', () => {
  const actions = [
    { actionId: 'a', title: 'Reduce food spending', status: 'active' },
    { actionId: 'b', title: 'Increase contributions', status: 'completed' },
    { actionId: 'c', title: 'Track habits', status: 'dismissed' },
  ];
  const ctx = buildActionHistoryContext(actions);
  expect(ctx.accepted).toEqual(['Reduce food spending']);
  expect(ctx.completed).toEqual(['Increase contributions']);
  expect(ctx.dismissed).toEqual(['Track habits']);
});

test('returns empty arrays when no history', () => {
  const ctx = buildActionHistoryContext([]);
  expect(ctx.accepted).toEqual([]);
  expect(ctx.completed).toEqual([]);
  expect(ctx.dismissed).toEqual([]);
});

test('abandoned actions are excluded from all history categories', () => {
  const actions = [{ actionId: 'a', title: 'Abandoned action', status: 'abandoned' }];
  const ctx = buildActionHistoryContext(actions);
  expect(ctx.accepted).toHaveLength(0);
  expect(ctx.completed).toHaveLength(0);
  expect(ctx.dismissed).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// computeActionSuccessRate
// ---------------------------------------------------------------------------

test('calculates correct success rate from mixed statuses', () => {
  const actions = [
    { status: 'active' },
    { status: 'completed' },
    { status: 'completed' },
    { status: 'abandoned' },
    { status: 'dismissed' },
  ];
  const result = computeActionSuccessRate(actions);
  // accepted = active + completed + abandoned = 4
  // completed = 2
  // successRate = round(2/4 * 100) = 50
  expect(result.accepted).toBe(4);
  expect(result.completed).toBe(2);
  expect(result.successRate).toBe(50);
});

test('returns successRate 0 when no accepted actions', () => {
  const result = computeActionSuccessRate([{ status: 'dismissed' }]);
  expect(result.accepted).toBe(0);
  expect(result.successRate).toBe(0);
});

test('returns zeros for empty array', () => {
  const result = computeActionSuccessRate([]);
  expect(result.accepted).toBe(0);
  expect(result.completed).toBe(0);
  expect(result.successRate).toBe(0);
});

test('successRate is 100 when all accepted actions are completed', () => {
  const actions = [{ status: 'completed' }, { status: 'completed' }];
  const result = computeActionSuccessRate(actions);
  expect(result.successRate).toBe(100);
});

// ---------------------------------------------------------------------------
// buildCompletionAlerts — Part 6
// ---------------------------------------------------------------------------

test('generates completion alert for each completed action', () => {
  const actions = [
    { actionId: 'reduce_food_spending', title: 'Reduce food spending', status: 'completed' },
  ];
  const alerts = buildCompletionAlerts(actions);
  expect(alerts).toHaveLength(1);
  expect(alerts[0].id).toBe('action_completed_reduce_food_spending');
  expect(alerts[0].severity).toBe('high');
  expect(alerts[0].tone).toBe('positive');
});

test('returns empty array when no completed actions', () => {
  const actions = [
    { actionId: 'a', title: 'Active action', status: 'active' },
    { actionId: 'b', title: 'Dismissed action', status: 'dismissed' },
  ];
  expect(buildCompletionAlerts(actions)).toHaveLength(0);
});

test('completion alert description references the action title', () => {
  const actions = [{ actionId: 'x', title: 'Increase goal contributions', status: 'completed' }];
  const alerts = buildCompletionAlerts(actions);
  expect(alerts[0].description).toContain('Increase goal contributions');
});

test('completion alert has signalId action_completed', () => {
  const actions = [{ actionId: 'x', title: 'Any action', status: 'completed' }];
  const alerts = buildCompletionAlerts(actions);
  expect(alerts[0].signalId).toBe('action_completed');
});

test('generates multiple alerts for multiple completed actions', () => {
  const actions = [
    { actionId: 'a', title: 'Action A', status: 'completed' },
    { actionId: 'b', title: 'Action B', status: 'completed' },
  ];
  expect(buildCompletionAlerts(actions)).toHaveLength(2);
});

// ---------------------------------------------------------------------------
// Structure validation
// ---------------------------------------------------------------------------

test('buildCompletionAlerts alert has all required fields', () => {
  const alerts = buildCompletionAlerts([{ actionId: 'x', title: 'Test', status: 'completed' }]);
  const a = alerts[0];
  expect(a).toHaveProperty('id');
  expect(a).toHaveProperty('severity');
  expect(a).toHaveProperty('tone');
  expect(a).toHaveProperty('title');
  expect(a).toHaveProperty('description');
  expect(a).toHaveProperty('signalId');
});
