// buildCoachPrompt is a pure synchronous function — no DB calls.
// We mock prisma only to satisfy the module import; it is never invoked here.
jest.mock('../lib/prisma.js', () => ({}));

import { buildCoachPrompt } from '../lib/ai.js';
import { JOURNEY_STATES } from '../lib/userState.js';

function prompt(extra = {}) {
  return buildCoachPrompt('test query', { journeyState: JOURNEY_STATES.ACTIVE_USER, ...extra });
}

// ---------------------------------------------------------------------------
// Part 5: [Reasoning Rules] — always present
// ---------------------------------------------------------------------------

test('[Reasoning Rules] section is always present in prompt output', () => {
  const { userMessage } = prompt();
  expect(userMessage).toContain('[Reasoning Rules]');
});

test('[Reasoning Rules] contains hallucination guardrail text', () => {
  const { userMessage } = prompt();
  expect(userMessage).toContain('Only reference metrics explicitly provided in this prompt.');
  expect(userMessage).toContain('Do not invent percentages');
  expect(userMessage).toContain('If insufficient information exists, state that additional data is needed.');
});

test('[Reasoning Rules] is present even when no coaching context provided', () => {
  const { userMessage } = buildCoachPrompt('question', {});
  expect(userMessage).toContain('[Reasoning Rules]');
});

// ---------------------------------------------------------------------------
// Part 2: [Evidence] — only when signals present
// ---------------------------------------------------------------------------

test('[Evidence] section omitted when no signals provided', () => {
  const { userMessage } = prompt();
  expect(userMessage).not.toContain('[Evidence]');
});

test('[Evidence] section present when spending change signal provided', () => {
  const { userMessage } = prompt({
    signals: {
      spendingChanges: [{ category: 'Food', pctChange: 38, currentAmount: 187, previousAmount: 135 }],
      savingsRate: null,
      goals: [],
    },
  });
  expect(userMessage).toContain('[Evidence]');
  expect(userMessage).toContain('Food spending increased 38%');
  expect(userMessage).toContain('Source: month-over-month category comparison.');
});

test('[Evidence] includes savings rate improvement text', () => {
  const { userMessage } = prompt({
    signals: {
      spendingChanges: [],
      savingsRate: { current: 31, previous: 19, delta: 12 },
      goals: [],
    },
  });
  expect(userMessage).toContain('[Evidence]');
  expect(userMessage).toContain('Savings rate improved by 12 percentage points (19% → 31%).');
  expect(userMessage).toContain('Source: monthly income vs expense calculation.');
});

test('[Evidence] includes savings rate decline text', () => {
  const { userMessage } = prompt({
    signals: {
      spendingChanges: [],
      savingsRate: { current: 10, previous: 25, delta: -15 },
      goals: [],
    },
  });
  expect(userMessage).toContain('Savings rate declined by 15 percentage points');
});

test('[Evidence] includes goal forecast text', () => {
  const { userMessage } = prompt({
    signals: {
      spendingChanges: [],
      savingsRate: null,
      goals: [{ title: 'Laptop', progress: 25, forecastMonths: 5, forecastConfidence: 'medium' }],
    },
  });
  expect(userMessage).toContain('[Evidence]');
  expect(userMessage).toContain('Laptop goal forecast: estimated completion in 5 months.');
  expect(userMessage).toContain('Source: average monthly goal contributions.');
});

test('[Evidence] omitted when signals object has empty collections', () => {
  const { userMessage } = prompt({
    signals: {
      spendingChanges: [],
      savingsRate: null,
      goals: [],
    },
  });
  expect(userMessage).not.toContain('[Evidence]');
});

// ---------------------------------------------------------------------------
// Part 4: [Financial Alerts] — only when alerts present
// ---------------------------------------------------------------------------

test('[Financial Alerts] section omitted when no alerts provided', () => {
  const { userMessage } = prompt();
  expect(userMessage).not.toContain('[Financial Alerts]');
});

test('[Financial Alerts] section present when alerts passed in coachingContext', () => {
  const { userMessage } = prompt({
    alerts: [{
      id: 'food_spike',
      severity: 'medium',
      tone: 'warning',
      title: 'Food spending increased',
      description: 'Food spending rose 38% compared with last month.',
      signalId: 'food_spending_increase',
    }],
  });
  expect(userMessage).toContain('[Financial Alerts]');
  expect(userMessage).toContain('Food spending rose 38%');
});

test('[Financial Alerts] groups alerts by severity with uppercase labels', () => {
  const { userMessage } = prompt({
    alerts: [
      { id: 'goal_completed', severity: 'high', tone: 'positive', title: 'Goal achieved', description: 'Laptop completed.', signalId: null },
      { id: 'food_spike', severity: 'medium', tone: 'warning', title: 'Food spending increased', description: 'Food spending rose 38% compared with last month.', signalId: null },
    ],
  });
  expect(userMessage).toContain('HIGH');
  expect(userMessage).toContain('MEDIUM');
  expect(userMessage).toContain('Laptop completed.');
  expect(userMessage).toContain('Food spending rose 38%');
});

test('[Financial Alerts] appears before [Evidence] in prompt output', () => {
  const { userMessage } = prompt({
    alerts: [{ id: 'food_spike', severity: 'medium', tone: 'warning', title: 'Food spending increased', description: 'Food up.', signalId: null }],
    signals: {
      spendingChanges: [{ category: 'Food', pctChange: 38, currentAmount: 187, previousAmount: 135 }],
      savingsRate: null,
      goals: [],
    },
  });
  const alertsPos = userMessage.indexOf('[Financial Alerts]');
  const evidencePos = userMessage.indexOf('[Evidence]');
  expect(alertsPos).toBeGreaterThan(-1);
  expect(evidencePos).toBeGreaterThan(-1);
  expect(alertsPos).toBeLessThan(evidencePos);
});

test('[Evidence] appears before [Reasoning Rules] in prompt output', () => {
  const { userMessage } = prompt({
    signals: {
      spendingChanges: [{ category: 'Food', pctChange: 38, currentAmount: 187, previousAmount: 135 }],
      savingsRate: null,
      goals: [],
    },
  });
  const evidencePos = userMessage.indexOf('[Evidence]');
  const rulesPos = userMessage.indexOf('[Reasoning Rules]');
  expect(evidencePos).toBeGreaterThan(-1);
  expect(rulesPos).toBeGreaterThan(-1);
  expect(evidencePos).toBeLessThan(rulesPos);
});

// ---------------------------------------------------------------------------
// Sprint 20G: [Financial Memory] — memory-aware coaching
// ---------------------------------------------------------------------------

test('[Financial Memory] section omitted when no memory provided', () => {
  const { userMessage } = prompt();
  expect(userMessage).not.toContain('[Financial Memory]');
});

test('[Financial Memory] section omitted when memory has all empty patterns', () => {
  const { userMessage } = prompt({
    memory: { improvingPatterns: [], worseningPatterns: [], resolvedAlerts: [] },
  });
  expect(userMessage).not.toContain('[Financial Memory]');
});

test('[Financial Memory] section present when improving patterns provided', () => {
  const { userMessage } = prompt({
    memory: { improvingPatterns: ['savings_rate'], worseningPatterns: [], resolvedAlerts: [] },
  });
  expect(userMessage).toContain('[Financial Memory]');
  expect(userMessage).toContain('Improving:');
  expect(userMessage).toContain('savings rate');
});

test('[Financial Memory] shows worsening patterns', () => {
  const { userMessage } = prompt({
    memory: { improvingPatterns: [], worseningPatterns: ['dining_spend'], resolvedAlerts: [] },
  });
  expect(userMessage).toContain('[Financial Memory]');
  expect(userMessage).toContain('Worsening:');
  expect(userMessage).toContain('dining spend');
});

test('[Financial Memory] shows resolved alerts', () => {
  const { userMessage } = prompt({
    memory: { improvingPatterns: [], worseningPatterns: [], resolvedAlerts: ['food_spike'] },
  });
  expect(userMessage).toContain('[Financial Memory]');
  expect(userMessage).toContain('Resolved:');
  expect(userMessage).toContain('food spike');
});

test('[Financial Memory] appears before [Evidence] in prompt output', () => {
  const { userMessage } = prompt({
    memory: { improvingPatterns: ['savings_rate'], worseningPatterns: [], resolvedAlerts: [] },
    signals: {
      spendingChanges: [{ category: 'Food', pctChange: 38, currentAmount: 187, previousAmount: 135 }],
      savingsRate: null,
      goals: [],
    },
  });
  const memoryPos = userMessage.indexOf('[Financial Memory]');
  const evidencePos = userMessage.indexOf('[Evidence]');
  expect(memoryPos).toBeGreaterThan(-1);
  expect(evidencePos).toBeGreaterThan(-1);
  expect(memoryPos).toBeLessThan(evidencePos);
});

test('[Historical Context] section present when streaks provided', () => {
  const { userMessage } = prompt({
    memory: {
      improvingPatterns: ['savings_rate'],
      worseningPatterns: [],
      resolvedAlerts: [],
      streaks: { savings_rate_improvement: 3 },
    },
  });
  expect(userMessage).toContain('[Historical Context]');
  expect(userMessage).toContain('savings rate improvement');
  expect(userMessage).toContain('3 consecutive period');
});

test('[Historical Context] omitted when streaks is empty', () => {
  const { userMessage } = prompt({
    memory: { improvingPatterns: ['savings_rate'], worseningPatterns: [], resolvedAlerts: [], streaks: {} },
  });
  expect(userMessage).not.toContain('[Historical Context]');
});

// ---------------------------------------------------------------------------
// Sprint 20H: [Financial Opportunities] — scored coaching priorities
// ---------------------------------------------------------------------------

test('[Financial Opportunities] section omitted when no opportunities provided', () => {
  const { userMessage } = prompt();
  expect(userMessage).not.toContain('[Financial Opportunities]');
});

test('[Financial Opportunities] section omitted when opportunities array is empty', () => {
  const { userMessage } = prompt({ opportunities: [] });
  expect(userMessage).not.toContain('[Financial Opportunities]');
});

test('[Financial Opportunities] present when high-impact opportunity provided', () => {
  const { userMessage } = prompt({
    opportunities: [{ id: 'reduce_food_spending', category: 'spending', impactScore: 75, confidence: 'high', title: 'Reduce food spending', description: 'Food spending remains elevated.' }],
  });
  expect(userMessage).toContain('[Financial Opportunities]');
  expect(userMessage).toContain('HIGH IMPACT');
  expect(userMessage).toContain('Food spending remains elevated.');
});

test('[Financial Opportunities] groups by impact tier with uppercase labels', () => {
  const { userMessage } = prompt({
    opportunities: [
      { id: 'reduce_food_spending', category: 'spending', impactScore: 75, confidence: 'high', title: 'High op', description: 'High desc.' },
      { id: 'goal_acceleration', category: 'goal', impactScore: 50, confidence: 'medium', title: 'Med op', description: 'Med desc.' },
      { id: 'maintain_tracking_habit', category: 'habit', impactScore: 25, confidence: 'high', title: 'Low op', description: 'Low desc.' },
    ],
  });
  expect(userMessage).toContain('HIGH IMPACT');
  expect(userMessage).toContain('MEDIUM IMPACT');
  expect(userMessage).toContain('LOW IMPACT');
  expect(userMessage).toContain('High desc.');
  expect(userMessage).toContain('Med desc.');
  expect(userMessage).toContain('Low desc.');
});

// ---------------------------------------------------------------------------
// Sprint 20I: [Recommended Actions] — specific, trackable action plans
// ---------------------------------------------------------------------------

test('[Recommended Actions] section omitted when no actions provided', () => {
  const { userMessage } = prompt();
  expect(userMessage).not.toContain('[Recommended Actions]');
});

test('[Recommended Actions] section omitted when actions array is empty', () => {
  const { userMessage } = prompt({ actions: [] });
  expect(userMessage).not.toContain('[Recommended Actions]');
});

test('[Recommended Actions] present when high-priority action provided', () => {
  const { userMessage } = prompt({
    actions: [{ id: 'reduce_food_spending', title: 'Reduce food spending', description: 'Lower monthly food spending by $100.', impactScore: 75, estimatedMonthlyBenefit: 100, difficulty: 'medium', priorityScore: 85 }],
  });
  expect(userMessage).toContain('[Recommended Actions]');
  expect(userMessage).toContain('HIGH PRIORITY');
  expect(userMessage).toContain('Lower monthly food spending by $100.');
  expect(userMessage).toContain('Expected benefit: $1200/year.');
});

test('[Recommended Actions] groups by HIGH/MEDIUM/LOW PRIORITY with correct labels', () => {
  const { userMessage } = prompt({
    actions: [
      { id: 'reduce_food_spending', title: 'Reduce food', description: 'High desc.', impactScore: 80, estimatedMonthlyBenefit: 100, difficulty: 'medium', priorityScore: 80 },
      { id: 'increase_goal_contributions', title: 'Save more', description: 'Med desc.', impactScore: 50, estimatedMonthlyBenefit: 50, difficulty: 'easy', priorityScore: 55 },
      { id: 'maintain_tracking_habit', title: 'Keep tracking', description: 'Low desc.', impactScore: 20, estimatedMonthlyBenefit: 0, difficulty: 'easy', priorityScore: 25 },
    ],
  });
  expect(userMessage).toContain('HIGH PRIORITY');
  expect(userMessage).toContain('MEDIUM PRIORITY');
  expect(userMessage).toContain('LOW PRIORITY');
  expect(userMessage).toContain('High desc.');
  expect(userMessage).toContain('Med desc.');
  expect(userMessage).toContain('Low desc.');
});

test('[Recommended Actions] appears after [Financial Opportunities] and before [Evidence]', () => {
  const { userMessage } = prompt({
    opportunities: [{ id: 'reduce_food_spending', category: 'spending', impactScore: 75, confidence: 'high', title: 'Reduce food spending', description: 'Food spending elevated.' }],
    actions: [{ id: 'reduce_food_spending', title: 'Reduce food spending', description: 'Lower monthly food spending by $100.', impactScore: 75, estimatedMonthlyBenefit: 100, difficulty: 'medium', priorityScore: 85 }],
    signals: {
      spendingChanges: [{ category: 'Food', pctChange: 38, currentAmount: 187, previousAmount: 135 }],
      savingsRate: null,
      goals: [],
    },
  });
  const opPos = userMessage.indexOf('[Financial Opportunities]');
  const actionsPos = userMessage.indexOf('[Recommended Actions]');
  const evidPos = userMessage.indexOf('[Evidence]');
  expect(opPos).toBeGreaterThan(-1);
  expect(actionsPos).toBeGreaterThan(-1);
  expect(evidPos).toBeGreaterThan(-1);
  expect(opPos).toBeLessThan(actionsPos);
  expect(actionsPos).toBeLessThan(evidPos);
});

// ---------------------------------------------------------------------------
// Sprint 20J: [Action History] — persistent behavioral record
// ---------------------------------------------------------------------------

test('[Action History] section omitted when no actionHistory provided', () => {
  const { userMessage } = prompt();
  expect(userMessage).not.toContain('[Action History]');
});

test('[Action History] section omitted when all arrays are empty', () => {
  const { userMessage } = prompt({ actionHistory: { accepted: [], completed: [], dismissed: [] } });
  expect(userMessage).not.toContain('[Action History]');
});

test('Scenario E: [Action History] present with accepted actions', () => {
  const { userMessage } = prompt({
    actionHistory: { accepted: ['Reduce food spending'], completed: [], dismissed: [] },
  });
  expect(userMessage).toContain('[Action History]');
  expect(userMessage).toContain('Accepted:');
  expect(userMessage).toContain('- Reduce food spending');
});

test('[Action History] shows completed and dismissed sections', () => {
  const { userMessage } = prompt({
    actionHistory: {
      accepted: [],
      completed: ['Increase goal contributions'],
      dismissed: ['Maintain tracking streak'],
    },
  });
  expect(userMessage).toContain('[Action History]');
  expect(userMessage).toContain('Completed:');
  expect(userMessage).toContain('- Increase goal contributions');
  expect(userMessage).toContain('Dismissed:');
  expect(userMessage).toContain('- Maintain tracking streak');
});

test('[Action History] appears after [Recommended Actions] and before [Evidence]', () => {
  const { userMessage } = prompt({
    actions: [{ id: 'reduce_food_spending', title: 'Reduce food spending', description: 'Lower monthly food spending by $100.', impactScore: 75, estimatedMonthlyBenefit: 100, difficulty: 'medium', priorityScore: 85 }],
    actionHistory: { accepted: ['Reduce food spending'], completed: [], dismissed: [] },
    signals: {
      spendingChanges: [{ category: 'Food', pctChange: 38, currentAmount: 187, previousAmount: 135 }],
      savingsRate: null,
      goals: [],
    },
  });
  const recActionsPos = userMessage.indexOf('[Recommended Actions]');
  const histPos = userMessage.indexOf('[Action History]');
  const evidPos = userMessage.indexOf('[Evidence]');
  expect(recActionsPos).toBeGreaterThan(-1);
  expect(histPos).toBeGreaterThan(-1);
  expect(evidPos).toBeGreaterThan(-1);
  expect(recActionsPos).toBeLessThan(histPos);
  expect(histPos).toBeLessThan(evidPos);
});

// ---------------------------------------------------------------------------
// Sprint 20K: [Financial Strategies] — coordinated multi-action plans
// ---------------------------------------------------------------------------

test('[Financial Strategies] section omitted when no strategies provided', () => {
  const { userMessage } = prompt();
  expect(userMessage).not.toContain('[Financial Strategies]');
});

test('[Financial Strategies] section omitted when strategies array is empty', () => {
  const { userMessage } = prompt({ strategies: [] });
  expect(userMessage).not.toContain('[Financial Strategies]');
});

test('[Financial Strategies] present when high-priority strategy provided', () => {
  const { userMessage } = prompt({
    strategies: [{
      id: 'accelerate_laptop',
      title: 'Accelerate Laptop',
      priorityScore: 85,
      projectedBenefit: { monthly: 150, annual: 1800 },
      actions: ['reduce_food_spending', 'increase_goal_contributions'],
      actionTitles: ['Reduce food spending', 'Increase goal contributions'],
      progress: { completedActions: 1, totalActions: 2, percentComplete: 50 },
    }],
  });
  expect(userMessage).toContain('[Financial Strategies]');
  expect(userMessage).toContain('HIGH PRIORITY');
  expect(userMessage).toContain('Accelerate Laptop');
  expect(userMessage).toContain('Actions:');
  expect(userMessage).toContain('- Reduce food spending');
  expect(userMessage).toContain('- Increase goal contributions');
  expect(userMessage).toContain('Progress:');
  expect(userMessage).toContain('1 of 2 actions completed');
});

test('[Financial Strategies] groups strategies by HIGH/MEDIUM/LOW PRIORITY', () => {
  const { userMessage } = prompt({
    strategies: [
      { id: 'accelerate_laptop', title: 'Accelerate Laptop', priorityScore: 85, projectedBenefit: { monthly: 150, annual: 1800 }, actions: ['reduce_food_spending'], actionTitles: ['Reduce food spending'], progress: null },
      { id: 'savings_growth', title: 'Savings Growth Strategy', priorityScore: 45, projectedBenefit: { monthly: 50, annual: 600 }, actions: ['maintain_tracking_habit'], actionTitles: ['Maintain tracking habit'], progress: null },
    ],
  });
  expect(userMessage).toContain('HIGH PRIORITY');
  expect(userMessage).toContain('MEDIUM PRIORITY');
  expect(userMessage).toContain('Accelerate Laptop');
  expect(userMessage).toContain('Savings Growth Strategy');
});

test('[Financial Strategies] appears after [Action History] and before [Evidence]', () => {
  const { userMessage } = prompt({
    actionHistory: { accepted: ['Reduce food spending'], completed: [], dismissed: [] },
    strategies: [{
      id: 'accelerate_laptop',
      title: 'Accelerate Laptop',
      priorityScore: 85,
      projectedBenefit: { monthly: 150, annual: 1800 },
      actions: ['reduce_food_spending'],
      actionTitles: ['Reduce food spending'],
      progress: null,
    }],
    signals: {
      spendingChanges: [{ category: 'Food', pctChange: 38, currentAmount: 187, previousAmount: 135 }],
      savingsRate: null,
      goals: [],
    },
  });
  const histPos = userMessage.indexOf('[Action History]');
  const stratPos = userMessage.indexOf('[Financial Strategies]');
  const evidPos = userMessage.indexOf('[Evidence]');
  expect(histPos).toBeGreaterThan(-1);
  expect(stratPos).toBeGreaterThan(-1);
  expect(evidPos).toBeGreaterThan(-1);
  expect(histPos).toBeLessThan(stratPos);
  expect(stratPos).toBeLessThan(evidPos);
});

// ---------------------------------------------------------------------------
// Sprint 20L: [Latest Review] — structured narrative recap
// ---------------------------------------------------------------------------

test('[Latest Review] section omitted when no review provided', () => {
  const { userMessage } = prompt();
  expect(userMessage).not.toContain('[Latest Review]');
});

test('[Latest Review] section omitted when review has no wins or concerns', () => {
  const { userMessage } = prompt({
    review: { period: 'monthly', wins: [], concerns: [], completedActions: 0, activeStrategies: 0, topOpportunity: null },
  });
  expect(userMessage).not.toContain('[Latest Review]');
});

test('[Latest Review] present with wins and concerns when review provided', () => {
  const { userMessage } = prompt({
    review: {
      period: 'monthly',
      wins: ['Savings rate improved'],
      concerns: ['Food spending increased'],
      completedActions: 1,
      activeStrategies: 1,
      topOpportunity: 'Reduce food spending',
    },
  });
  expect(userMessage).toContain('[Latest Review]');
  expect(userMessage).toContain('Wins:');
  expect(userMessage).toContain('- Savings rate improved');
  expect(userMessage).toContain('Concerns:');
  expect(userMessage).toContain('- Food spending increased');
});

test('[Latest Review] shows active strategies count when > 0', () => {
  const { userMessage } = prompt({
    review: { period: 'monthly', wins: ['Savings improved'], concerns: [], completedActions: 0, activeStrategies: 2, topOpportunity: null },
  });
  expect(userMessage).toContain('[Latest Review]');
  expect(userMessage).toContain('Active strategies: 2');
});

test('[Latest Review] appears after [Financial Strategies] and before [Evidence]', () => {
  const { userMessage } = prompt({
    strategies: [{
      id: 'accelerate_laptop',
      title: 'Accelerate Laptop',
      priorityScore: 85,
      projectedBenefit: { monthly: 150, annual: 1800 },
      actions: ['reduce_food_spending'],
      actionTitles: ['Reduce food spending'],
      progress: null,
    }],
    review: {
      period: 'monthly',
      wins: ['Savings rate improved'],
      concerns: [],
      completedActions: 0,
      activeStrategies: 1,
      topOpportunity: null,
    },
    signals: {
      spendingChanges: [{ category: 'Food', pctChange: 38, currentAmount: 187, previousAmount: 135 }],
      savingsRate: null,
      goals: [],
    },
  });
  const stratPos = userMessage.indexOf('[Financial Strategies]');
  const reviewPos = userMessage.indexOf('[Latest Review]');
  const evidPos = userMessage.indexOf('[Evidence]');
  expect(stratPos).toBeGreaterThan(-1);
  expect(reviewPos).toBeGreaterThan(-1);
  expect(evidPos).toBeGreaterThan(-1);
  expect(stratPos).toBeLessThan(reviewPos);
  expect(reviewPos).toBeLessThan(evidPos);
});

// ---------------------------------------------------------------------------
// Sprint 20M: [Financial Roadmap] — destination-aware long-term plan
// ---------------------------------------------------------------------------

test('[Financial Roadmap] section omitted when no roadmap provided', () => {
  const { userMessage } = prompt();
  expect(userMessage).not.toContain('[Financial Roadmap]');
});

test('[Financial Roadmap] section omitted when roadmap is null', () => {
  const { userMessage } = prompt({ roadmap: null });
  expect(userMessage).not.toContain('[Financial Roadmap]');
});

test('[Financial Roadmap] present with current stage and next milestone', () => {
  const { userMessage } = prompt({
    roadmap: {
      title: 'Laptop Plan',
      currentGoal: { id: 'g1', title: 'Laptop', progressPercent: 30 },
      nextMilestone: { id: 'save_50', title: 'Reach 50%', completed: false },
      projectedCompletionDate: '2027-02-01',
      milestones: [],
      goalOrder: ['g1'],
    },
  });
  expect(userMessage).toContain('[Financial Roadmap]');
  expect(userMessage).toContain('Current Stage:');
  expect(userMessage).toContain('Laptop');
  expect(userMessage).toContain('Next Milestone:');
  expect(userMessage).toContain('Reach 50%');
});

test('[Financial Roadmap] includes Projected Completion when date available', () => {
  const { userMessage } = prompt({
    roadmap: {
      title: 'Laptop Plan',
      currentGoal: { id: 'g1', title: 'Laptop', progressPercent: 30 },
      nextMilestone: { id: 'save_50', title: 'Reach 50%', completed: false },
      projectedCompletionDate: '2027-02-01',
      milestones: [],
      goalOrder: ['g1'],
    },
  });
  expect(userMessage).toContain('Projected Completion:');
  expect(userMessage).toContain('February 2027');
});

test('[Financial Roadmap] appears after [Latest Review] and before [Past Context]', () => {
  const { userMessage } = prompt({
    review: {
      period: 'monthly',
      wins: ['Savings rate improved'],
      concerns: [],
      completedActions: 0,
      activeStrategies: 1,
      topOpportunity: null,
    },
    roadmap: {
      title: 'Laptop Plan',
      currentGoal: { id: 'g1', title: 'Laptop', progressPercent: 30 },
      nextMilestone: { id: 'save_50', title: 'Reach 50%', completed: false },
      projectedCompletionDate: '2027-02-01',
      milestones: [],
      goalOrder: ['g1'],
    },
  });
  const reviewPos = userMessage.indexOf('[Latest Review]');
  const roadmapPos = userMessage.indexOf('[Financial Roadmap]');
  const rulesPos = userMessage.indexOf('[Reasoning Rules]');
  expect(reviewPos).toBeGreaterThan(-1);
  expect(roadmapPos).toBeGreaterThan(-1);
  expect(rulesPos).toBeGreaterThan(-1);
  expect(reviewPos).toBeLessThan(roadmapPos);
  expect(roadmapPos).toBeLessThan(rulesPos);
});

test('[Financial Opportunities] appears after [Financial Memory] and before [Evidence]', () => {
  const { userMessage } = prompt({
    memory: { improvingPatterns: ['savings_rate'], worseningPatterns: [], resolvedAlerts: [], streaks: {} },
    opportunities: [{ id: 'goal_acceleration', category: 'goal', impactScore: 55, confidence: 'medium', title: 'Goal op', description: 'Goal desc.' }],
    signals: {
      spendingChanges: [{ category: 'Food', pctChange: 38, currentAmount: 187, previousAmount: 135 }],
      savingsRate: null,
      goals: [],
    },
  });
  const memPos = userMessage.indexOf('[Financial Memory]');
  const opPos = userMessage.indexOf('[Financial Opportunities]');
  const evidPos = userMessage.indexOf('[Evidence]');
  expect(memPos).toBeGreaterThan(-1);
  expect(opPos).toBeGreaterThan(-1);
  expect(evidPos).toBeGreaterThan(-1);
  expect(memPos).toBeLessThan(opPos);
  expect(opPos).toBeLessThan(evidPos);
});
