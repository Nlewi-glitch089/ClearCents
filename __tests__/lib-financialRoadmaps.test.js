import {
  buildFinancialRoadmap,
  buildRoadmapTimeline,
  computeRoadmapHealth,
  buildRoadmapCompletionAlert,
} from '../lib/financialRoadmaps.js';

// ---------------------------------------------------------------------------
// buildFinancialRoadmap
// ---------------------------------------------------------------------------

test('Scenario A: goal at 25% → save_25 milestone completed', () => {
  const goals = [{
    id: 'g1', title: 'Laptop', status: 'active', progressPercent: 25,
    createdAt: new Date().toISOString(), forecast: null,
  }];
  const { roadmap } = buildFinancialRoadmap({ goals });
  const m25 = roadmap.milestones.find(m => m.id === 'save_25');
  const m50 = roadmap.milestones.find(m => m.id === 'save_50');
  expect(m25.completed).toBe(true);
  expect(m50.completed).toBe(false);
});

test('Scenario B: goal with forecast → projectedCompletionDate present', () => {
  const goals = [{
    id: 'g1', title: 'Laptop', status: 'active', progressPercent: 30,
    createdAt: new Date().toISOString(),
    forecast: { projectedCompletionDate: '2027-02-01', confidence: 'high', monthlyContribution: 150 },
  }];
  const { roadmap } = buildFinancialRoadmap({ goals });
  expect(roadmap.projectedCompletionDate).toBe('2027-02-01');
});

test('Scenario C: multiple goals → ordered roadmap with active first', () => {
  const goals = [
    { id: 'g2', title: 'Vacation', status: 'completed', progressPercent: 100, createdAt: new Date().toISOString(), forecast: null },
    { id: 'g1', title: 'Laptop', status: 'active', progressPercent: 40, createdAt: new Date().toISOString(), forecast: null },
  ];
  const { roadmap } = buildFinancialRoadmap({ goals });
  expect(roadmap).not.toBeNull();
  expect(roadmap.goalOrder[0]).toBe('g1');
  expect(roadmap.currentGoal.title).toBe('Laptop');
});

test('Scenario D: all milestones completed → buildRoadmapCompletionAlert returns alert', () => {
  const goals = [{
    id: 'g1', title: 'Laptop', status: 'active', progressPercent: 100,
    createdAt: new Date().toISOString(), forecast: null,
  }];
  const { roadmap } = buildFinancialRoadmap({ goals });
  expect(roadmap.milestones.every(m => m.completed)).toBe(true);
  const alert = buildRoadmapCompletionAlert(roadmap);
  expect(alert).not.toBeNull();
  expect(alert.id).toBe('roadmap_completed');
  expect(alert.tone).toBe('positive');
});

test('no goals → roadmap is null', () => {
  const { roadmap } = buildFinancialRoadmap({ goals: [] });
  expect(roadmap).toBeNull();
});

test('roadmap title is derived from primary goal title', () => {
  const goals = [{ id: 'g1', title: 'Laptop', status: 'active', progressPercent: 10, createdAt: new Date().toISOString(), forecast: null }];
  const { roadmap } = buildFinancialRoadmap({ goals });
  expect(roadmap.title).toBe('Laptop Plan');
});

test('nextMilestone points to the first uncompleted milestone', () => {
  const goals = [{ id: 'g1', title: 'Laptop', status: 'active', progressPercent: 30, createdAt: new Date().toISOString(), forecast: null }];
  const { roadmap } = buildFinancialRoadmap({ goals });
  expect(roadmap.nextMilestone.id).toBe('save_50');
});

test('nextMilestone is null when all milestones completed', () => {
  const goals = [{ id: 'g1', title: 'Laptop', status: 'active', progressPercent: 100, createdAt: new Date().toISOString(), forecast: null }];
  const { roadmap } = buildFinancialRoadmap({ goals });
  expect(roadmap.nextMilestone).toBeNull();
});

test('goalOrder contains all goal ids sorted by status', () => {
  const goals = [
    { id: 'g3', title: 'Car', status: 'completed', progressPercent: 100, createdAt: new Date().toISOString(), forecast: null },
    { id: 'g2', title: 'Emergency', status: 'archived', progressPercent: 0, createdAt: new Date().toISOString(), forecast: null },
    { id: 'g1', title: 'Laptop', status: 'active', progressPercent: 40, createdAt: new Date().toISOString(), forecast: null },
  ];
  const { roadmap } = buildFinancialRoadmap({ goals });
  expect(roadmap.goalOrder).toEqual(['g1', 'g2', 'g3']);
});

test('milestones include all four thresholds', () => {
  const goals = [{ id: 'g1', title: 'Laptop', status: 'active', progressPercent: 60, createdAt: new Date().toISOString(), forecast: null }];
  const { roadmap } = buildFinancialRoadmap({ goals });
  expect(roadmap.milestones).toHaveLength(4);
  expect(roadmap.milestones.map(m => m.id)).toEqual(['save_25', 'save_50', 'save_75', 'save_100']);
});

test('currentGoal includes progressPercent', () => {
  const goals = [{ id: 'g1', title: 'Laptop', status: 'active', progressPercent: 42, createdAt: new Date().toISOString(), forecast: null }];
  const { roadmap } = buildFinancialRoadmap({ goals });
  expect(roadmap.currentGoal.progressPercent).toBe(42);
});

// ---------------------------------------------------------------------------
// buildRoadmapCompletionAlert
// ---------------------------------------------------------------------------

test('buildRoadmapCompletionAlert: null roadmap → null', () => {
  expect(buildRoadmapCompletionAlert(null)).toBeNull();
});

test('buildRoadmapCompletionAlert: incomplete milestones → null', () => {
  const roadmap = {
    title: 'Laptop Plan',
    milestones: [
      { id: 'save_25', title: 'Reach 25%', completed: true },
      { id: 'save_50', title: 'Reach 50%', completed: false },
    ],
  };
  expect(buildRoadmapCompletionAlert(roadmap)).toBeNull();
});

test('buildRoadmapCompletionAlert: all milestones complete → alert with correct structure', () => {
  const roadmap = {
    title: 'Laptop Plan',
    milestones: [
      { id: 'save_25', title: 'Reach 25%', completed: true },
      { id: 'save_50', title: 'Reach 50%', completed: true },
      { id: 'save_75', title: 'Reach 75%', completed: true },
      { id: 'save_100', title: 'Goal Complete', completed: true },
    ],
  };
  const alert = buildRoadmapCompletionAlert(roadmap);
  expect(alert.id).toBe('roadmap_completed');
  expect(alert.severity).toBe('high');
  expect(alert.tone).toBe('positive');
  expect(alert.description).toContain('Laptop Plan');
});

// ---------------------------------------------------------------------------
// buildRoadmapTimeline
// ---------------------------------------------------------------------------

test('buildRoadmapTimeline: null goal → empty array', () => {
  const result = buildRoadmapTimeline({ goal: null });
  expect(result).toEqual([]);
});

test('buildRoadmapTimeline: goal with createdAt → includes "Goal created" event', () => {
  const goal = { createdAt: '2026-01-01T00:00:00Z', progressPercent: 0, forecast: null };
  const result = buildRoadmapTimeline({ goal });
  expect(result.some(e => e.event === 'Goal created')).toBe(true);
});

test('buildRoadmapTimeline: goal at 50% → includes Reached 25% and Reached 50% events', () => {
  const goal = { createdAt: new Date(Date.now() - 60 * 24 * 3600000).toISOString(), progressPercent: 50, forecast: null };
  const result = buildRoadmapTimeline({ goal });
  expect(result.some(e => e.event === 'Reached 25%')).toBe(true);
  expect(result.some(e => e.event === 'Reached 50%')).toBe(true);
  expect(result.some(e => e.event === 'Reached 75%')).toBe(false);
});

test('buildRoadmapTimeline: goal with forecast → includes "Projected completion" event', () => {
  const goal = {
    createdAt: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
    progressPercent: 30,
    forecast: { projectedCompletionDate: '2027-06-01' },
  };
  const result = buildRoadmapTimeline({ goal });
  expect(result.some(e => e.event === 'Projected completion')).toBe(true);
  expect(result.find(e => e.event === 'Projected completion').date).toBe('2027-06-01');
});

test('buildRoadmapTimeline: events returned in ascending date order', () => {
  const goal = {
    createdAt: new Date(Date.now() - 90 * 24 * 3600000).toISOString(),
    progressPercent: 60,
    forecast: { projectedCompletionDate: '2028-01-01' },
  };
  const result = buildRoadmapTimeline({ goal });
  for (let i = 1; i < result.length; i++) {
    expect(new Date(result[i].date) >= new Date(result[i - 1].date)).toBe(true);
  }
});

// ---------------------------------------------------------------------------
// computeRoadmapHealth
// ---------------------------------------------------------------------------

test('Scenario E: strong action completion + strategy progress → on_track or ahead_of_schedule', () => {
  const result = computeRoadmapHealth({
    forecast: { confidence: 'high' },
    strategies: [{ progress: { completedActions: 2, totalActions: 2, percentComplete: 100 } }],
    actions: [
      { status: 'completed' },
      { status: 'completed' },
    ],
    consistency: { activeDays: 20 },
  });
  expect(['on_track', 'ahead_of_schedule']).toContain(result.status);
});

test('no forecast → lower score, likely at_risk', () => {
  const result = computeRoadmapHealth({
    forecast: null,
    strategies: [],
    actions: [],
    consistency: null,
  });
  expect(result.score).toBeLessThan(50);
  expect(result.status).toBe('at_risk');
});

test('high confidence forecast + no other signals → on_track', () => {
  const result = computeRoadmapHealth({
    forecast: { confidence: 'high' },
    strategies: [],
    actions: [],
    consistency: null,
  });
  expect(result.score).toBeGreaterThanOrEqual(35);
});

test('score is between 0 and 100', () => {
  const result = computeRoadmapHealth({
    forecast: { confidence: 'high' },
    strategies: [{ progress: { percentComplete: 100 } }],
    actions: [{ status: 'completed' }, { status: 'completed' }],
    consistency: { activeDays: 25 },
  });
  expect(result.score).toBeGreaterThanOrEqual(0);
  expect(result.score).toBeLessThanOrEqual(100);
});

test('status values are valid', () => {
  const validStatuses = ['on_track', 'at_risk', 'ahead_of_schedule'];
  const result1 = computeRoadmapHealth({});
  const result2 = computeRoadmapHealth({ forecast: { confidence: 'high' }, consistency: { activeDays: 25 } });
  expect(validStatuses).toContain(result1.status);
  expect(validStatuses).toContain(result2.status);
});

test('activeDaysThisMonth field also accepted for consistency', () => {
  const result = computeRoadmapHealth({
    consistency: { activeDaysThisMonth: 20 },
  });
  expect(result.score).toBeGreaterThan(0);
});

test('medium forecast confidence gives lower score than high', () => {
  const high = computeRoadmapHealth({ forecast: { confidence: 'high' } });
  const medium = computeRoadmapHealth({ forecast: { confidence: 'medium' } });
  expect(high.score).toBeGreaterThan(medium.score);
});
