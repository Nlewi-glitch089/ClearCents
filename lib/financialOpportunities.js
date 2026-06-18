export function computeOpportunityScore({
  magnitude = 0,
  persistence = 1,
  confidence = 'medium',
  hasGoalImpact = false,
} = {}) {
  const persistenceBonus = Math.min((persistence - 1) * 5, 20);
  const confidenceAdj = confidence === 'high' ? 10 : confidence === 'low' ? -10 : 0;
  const base = Math.min(magnitude + persistenceBonus + confidenceAdj, 100);
  const goalMultiplier = hasGoalImpact ? 1.15 : 1;
  return Math.min(Math.round(base * goalMultiplier), 100);
}

export function buildFinancialOpportunities({
  alerts = [],
  signals = null,
  memory = null,
  goals = [],
  summary = null,
} = {}) {
  const opportunities = [];
  const hasActiveGoal = Array.isArray(goals) && goals.length > 0;

  // 1. Spending reduction — from signals.spendingChanges (increases only, threshold >= 25%)
  for (const sc of (signals?.spendingChanges || [])) {
    if (sc.pctChange < 25) continue;

    const baseId = sc.category.toLowerCase().replace(/\s+/g, '_');
    const signalId = `${baseId}_spending_increase`;
    const isRecurring = (memory?.recurringPatterns || []).includes(signalId);
    const isWorsening = (memory?.worseningPatterns || []).includes(`${baseId}_spend`);

    const magnitude = sc.pctChange >= 75 ? 65 : sc.pctChange >= 50 ? 55 : 40;
    const persistence = isWorsening ? 3 : isRecurring ? 2 : 1;
    const confidence = isRecurring || isWorsening ? 'high' : 'medium';

    const impactScore = computeOpportunityScore({ magnitude, persistence, confidence, hasGoalImpact: hasActiveGoal });
    const description = isRecurring
      ? `${sc.category} spending remains elevated — ${sc.pctChange}% above last month.`
      : `${sc.category} spending increased ${sc.pctChange}% compared with last month.`;

    opportunities.push({
      id: `reduce_${baseId}_spending`,
      category: 'spending',
      impactScore,
      confidence,
      title: `Reduce ${sc.category.toLowerCase()} spending`,
      description,
    });
  }

  // 2. Savings improvement — from signals.savingsRate delta
  if (signals?.savingsRate?.delta != null && signals.savingsRate.delta >= 10) {
    const delta = signals.savingsRate.delta;
    const magnitude = delta >= 30 ? 65 : delta >= 20 ? 50 : 35;
    const impactScore = computeOpportunityScore({ magnitude, persistence: 1, confidence: 'medium', hasGoalImpact: hasActiveGoal });

    opportunities.push({
      id: 'increase_goal_contributions',
      category: 'savings',
      impactScore,
      confidence: 'medium',
      title: 'Increase goal contributions',
      description: `Your savings rate improved by ${delta} percentage points — consider directing the surplus toward your savings goal.`,
    });
  }

  // 3. Goal acceleration — from enriched goals with active forecasts
  for (const g of (goals || [])) {
    if (!g) continue;
    const forecastMonths = g.forecast?.projectedCompletionMonths;
    if (!forecastMonths || forecastMonths <= 0) continue;

    const isSavingsImproving = (memory?.improvingPatterns || []).includes('savings_rate');
    const magnitude = isSavingsImproving ? 50 : 35;
    const forecastConf = g.forecast?.confidence || 'medium';

    const impactScore = computeOpportunityScore({ magnitude, persistence: 1, confidence: forecastConf, hasGoalImpact: true });

    opportunities.push({
      id: 'goal_acceleration',
      category: 'goal',
      impactScore,
      confidence: forecastConf,
      title: `Accelerate ${g.title} goal`,
      description: `At current pace, ${g.title} completes in ${forecastMonths} month${forecastMonths !== 1 ? 's' : ''}. Small contribution increases could shorten this.`,
    });
  }

  // 4. Habit reinforcement — from memory streaks sustained for 3+ cycles
  if (memory?.streaks) {
    const sustainedStreaks = Object.entries(memory.streaks).filter(([, count]) => count >= 3);
    if (sustainedStreaks.length > 0) {
      const maxStreak = Math.max(...sustainedStreaks.map(([, count]) => count));
      const impactScore = computeOpportunityScore({ magnitude: 15, persistence: maxStreak, confidence: 'high', hasGoalImpact: false });

      opportunities.push({
        id: 'maintain_tracking_habit',
        category: 'habit',
        impactScore,
        confidence: 'high',
        title: 'Maintain tracking habit',
        description: `You've maintained consistent financial tracking for ${maxStreak} consecutive periods — keep it up.`,
      });
    }
  }

  opportunities.sort((a, b) => b.impactScore - a.impactScore);

  return { opportunities };
}
