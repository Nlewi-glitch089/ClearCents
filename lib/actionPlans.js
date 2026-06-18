export function computeActionPriority({ impactScore = 0, difficulty = 'medium', goalImpact = false } = {}) {
  const difficultyAdj = difficulty === 'easy' ? 10 : difficulty === 'hard' ? -10 : 0;
  const goalBonus = goalImpact ? 10 : 0;
  return Math.min(Math.round(impactScore + difficultyAdj + goalBonus), 100);
}

export function buildActionPlans({ opportunities = [], goals = [], summary = null } = {}) {
  const plans = [];
  const hasActiveGoal = Array.isArray(goals) && goals.length > 0;

  for (const opp of (opportunities || [])) {
    if (!opp || !opp.id) continue;

    if (opp.id.startsWith('reduce_') && opp.id.endsWith('_spending')) {
      const estimatedMonthlyBenefit = 100;
      const difficulty = 'medium';
      const priorityScore = computeActionPriority({ impactScore: opp.impactScore, difficulty, goalImpact: hasActiveGoal });
      const categorySlug = opp.id.replace(/^reduce_/, '').replace(/_spending$/, '');
      const categoryName = categorySlug.replace(/_/g, ' ');
      plans.push({
        id: opp.id,
        title: opp.title,
        description: `Lower monthly ${categoryName} spending by $${estimatedMonthlyBenefit}.`,
        impactScore: opp.impactScore,
        estimatedMonthlyBenefit,
        difficulty,
        priorityScore,
      });
    } else if (opp.id === 'increase_goal_contributions') {
      const estimatedMonthlyBenefit = 50;
      const difficulty = 'easy';
      const priorityScore = computeActionPriority({ impactScore: opp.impactScore, difficulty, goalImpact: hasActiveGoal });
      plans.push({
        id: opp.id,
        title: opp.title,
        description: `Automatically transfer an additional $${estimatedMonthlyBenefit} of surplus income to savings.`,
        impactScore: opp.impactScore,
        estimatedMonthlyBenefit,
        difficulty,
        priorityScore,
      });
    } else if (opp.id === 'goal_acceleration') {
      const estimatedMonthlyBenefit = 50;
      const difficulty = 'medium';
      const priorityScore = computeActionPriority({ impactScore: opp.impactScore, difficulty, goalImpact: true });
      plans.push({
        id: opp.id,
        title: opp.title,
        description: `Increase monthly contributions by $${estimatedMonthlyBenefit}.`,
        impactScore: opp.impactScore,
        estimatedMonthlyBenefit,
        difficulty,
        priorityScore,
      });
    } else if (opp.id === 'maintain_tracking_habit') {
      const estimatedMonthlyBenefit = 0;
      const difficulty = 'easy';
      const priorityScore = computeActionPriority({ impactScore: opp.impactScore, difficulty, goalImpact: false });
      plans.push({
        id: opp.id,
        title: opp.title,
        description: 'Maintain current tracking behavior.',
        impactScore: opp.impactScore,
        estimatedMonthlyBenefit,
        difficulty,
        priorityScore,
      });
    }
  }

  plans.sort((a, b) => b.priorityScore - a.priorityScore);
  return { plans };
}

export function evaluateActionOutcome({ actionId = '', beforeMetrics = {}, afterMetrics = {} } = {}) {
  if (actionId.startsWith('reduce_') && actionId.endsWith('_spending')) {
    const before = beforeMetrics.amount ?? 0;
    const after = afterMetrics.amount ?? 0;
    const improvement = before - after;
    return { success: improvement > 0, improvement, metric: 'spending_reduction' };
  }
  if (actionId === 'goal_acceleration') {
    const before = beforeMetrics.projectedCompletionMonths ?? 0;
    const after = afterMetrics.projectedCompletionMonths ?? 0;
    const improvement = before - after;
    return { success: improvement > 0, improvement, metric: 'forecast_improvement' };
  }
  if (actionId === 'increase_goal_contributions') {
    const before = beforeMetrics.savingsRate ?? 0;
    const after = afterMetrics.savingsRate ?? 0;
    const improvement = after - before;
    return { success: improvement > 0, improvement, metric: 'savings_rate_improvement' };
  }
  if (actionId === 'maintain_tracking_habit') {
    const before = beforeMetrics.streak ?? 0;
    const after = afterMetrics.streak ?? 0;
    const improvement = after - before;
    return { success: after >= before, improvement, metric: 'habit_continuation' };
  }
  return { success: false, improvement: 0, metric: 'unknown' };
}
