const SPENDING_PREFIX = 'reduce_';
const GOAL_ACTION_IDS = new Set(['increase_goal_contributions', 'goal_acceleration']);
const HABIT_ACTION_IDS = new Set(['maintain_tracking_habit']);

function categorizeActions(actions) {
  const spending = actions.filter(a => String(a.id).startsWith(SPENDING_PREFIX));
  const goal = actions.filter(a => GOAL_ACTION_IDS.has(a.id));
  const habit = actions.filter(a => HABIT_ACTION_IDS.has(a.id));
  return { spending, goal, habit };
}

export function computeStrategyScore({ totalBenefit = 0, goalImpact = false, actionCount = 1, confidence = 'medium' } = {}) {
  const benefitScore = Math.min(Math.floor(totalBenefit / 2), 60);
  const goalBonus = goalImpact ? 20 : 0;
  const actionPenalty = Math.max(0, (actionCount - 1) * 5);
  const confidenceBonus = confidence === 'high' ? 10 : confidence === 'low' ? -10 : 0;
  return Math.min(Math.max(Math.round(benefitScore + goalBonus - actionPenalty + confidenceBonus), 0), 100);
}

export function buildStrategyProgress(strategy, financialActions = []) {
  const totalActions = strategy.actions.length;
  const completedActions = strategy.actions.filter(actionId =>
    financialActions.some(fa => fa.actionId === actionId && fa.status === 'completed')
  ).length;
  const percentComplete = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;
  return { completedActions, totalActions, percentComplete };
}

export function buildStrategyCompletionAlerts(strategies, financialActions = []) {
  return strategies
    .filter(strategy => {
      const progress = buildStrategyProgress(strategy, financialActions);
      return progress.totalActions > 0 && progress.percentComplete === 100;
    })
    .map(strategy => ({
      id: `strategy_completed_${strategy.id}`,
      severity: 'high',
      tone: 'positive',
      title: 'Strategy completed',
      description: `${strategy.title} completed.`,
      signalId: 'strategy_completed',
    }));
}

export function evaluateStrategyOutcome({ strategyId = '', beforeMetrics = {}, afterMetrics = {} } = {}) {
  if (strategyId.includes('accelerate') || strategyId.includes('goal_acceleration')) {
    const improvement = (beforeMetrics.projectedCompletionMonths ?? 0) - (afterMetrics.projectedCompletionMonths ?? 0);
    return { success: improvement > 0, improvement, metric: 'projectedCompletionMonths' };
  }
  if (strategyId.includes('savings_growth')) {
    const improvement = (afterMetrics.savingsRate ?? 0) - (beforeMetrics.savingsRate ?? 0);
    return { success: improvement > 0, improvement, metric: 'savingsRate' };
  }
  if (strategyId.includes('spending_recovery')) {
    const improvement = (beforeMetrics.totalSpending ?? 0) - (afterMetrics.totalSpending ?? 0);
    return { success: improvement > 0, improvement, metric: 'totalSpending' };
  }
  return { success: false, improvement: 0, metric: null };
}

export function buildFinancialStrategies({ actions = [], opportunities = [], goals = [], summary = null, memory = null } = {}) {
  const { spending, goal, habit } = categorizeActions(actions);

  // Part 10: adapt complexity to historical completion rate
  const successRate = memory?.successRate ?? 100;
  const maxActions = successRate >= 50 ? 3 : 1;

  const strategies = [];

  // Template 1: Goal Acceleration — spending reduction + goal contribution actions
  if (goal.length > 0 && spending.length > 0) {
    const stratActions = [...spending, ...goal].slice(0, maxActions);
    const totalBenefit = stratActions.reduce((s, a) => s + (a.estimatedMonthlyBenefit ?? 0), 0);
    const goalName = goals[0]?.title ?? 'Goal';
    const slugBase = goalName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    strategies.push({
      id: `accelerate_${slugBase}`,
      title: `Accelerate ${goalName}`,
      priorityScore: computeStrategyScore({ totalBenefit, goalImpact: true, actionCount: stratActions.length, confidence: 'high' }),
      projectedBenefit: { monthly: totalBenefit, annual: totalBenefit * 12 },
      actions: stratActions.map(a => a.id),
      actionTitles: stratActions.map(a => a.title),
    });
  } else if (spending.length > 0 && habit.length > 0) {
    // Template 2: Savings Growth — spending reduction + consistency habit, no goal
    const stratActions = [...spending.slice(0, 1), ...habit.slice(0, 1)].slice(0, maxActions);
    const totalBenefit = stratActions.reduce((s, a) => s + (a.estimatedMonthlyBenefit ?? 0), 0);
    strategies.push({
      id: 'savings_growth',
      title: 'Savings Growth Strategy',
      priorityScore: computeStrategyScore({ totalBenefit, goalImpact: false, actionCount: stratActions.length, confidence: 'medium' }),
      projectedBenefit: { monthly: totalBenefit, annual: totalBenefit * 12 },
      actions: stratActions.map(a => a.id),
      actionTitles: stratActions.map(a => a.title),
    });
  } else if (spending.length >= 2) {
    // Template 3: Spending Recovery — multiple spending reductions, no goal or habit
    const stratActions = spending.slice(0, maxActions);
    const totalBenefit = stratActions.reduce((s, a) => s + (a.estimatedMonthlyBenefit ?? 0), 0);
    strategies.push({
      id: 'spending_recovery',
      title: 'Spending Recovery Strategy',
      priorityScore: computeStrategyScore({ totalBenefit, goalImpact: false, actionCount: stratActions.length, confidence: 'medium' }),
      projectedBenefit: { monthly: totalBenefit, annual: totalBenefit * 12 },
      actions: stratActions.map(a => a.id),
      actionTitles: stratActions.map(a => a.title),
    });
  }

  return { strategies: strategies.sort((a, b) => b.priorityScore - a.priorityScore) };
}
