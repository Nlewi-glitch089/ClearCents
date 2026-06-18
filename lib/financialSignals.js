export function buildFinancialSignals({ summary = null, goals = [], trends = null, consistency = null } = {}) {
  const supportingSignals = [];
  const supportingData = [];

  // Savings rate — requires both this and last month data from computeTrendContext
  let savingsRateSignal = null;
  if (
    trends?.savingsRateDelta != null &&
    trends?.thisMonthSavingsRate != null &&
    trends?.lastMonthSavingsRate != null
  ) {
    const delta = trends.savingsRateDelta;
    savingsRateSignal = { current: trends.thisMonthSavingsRate, previous: trends.lastMonthSavingsRate, delta };
    if (delta > 0) {
      supportingSignals.push('savings_rate_improvement');
      supportingData.push({ label: 'Savings Rate', value: `+${delta} pts` });
    } else if (delta < 0) {
      supportingSignals.push('savings_rate_decline');
      supportingData.push({ label: 'Savings Rate', value: `${delta} pts` });
    }
  }

  // Category spending changes — increases then decreases, from computeTrendContext output
  const spendingChanges = [];
  for (const cat of (trends?.categoryIncreases || [])) {
    spendingChanges.push({ category: cat.name, pctChange: cat.pctChange, currentAmount: cat.thisMonthAmount, previousAmount: cat.lastMonthAmount });
    const id = cat.name.toLowerCase().replace(/\s+/g, '_') + '_spending_increase';
    supportingSignals.push(id);
    supportingData.push({ label: `${cat.name} Spending`, value: `+${cat.pctChange}%` });
  }
  for (const cat of (trends?.categoryDecreases || [])) {
    spendingChanges.push({ category: cat.name, pctChange: cat.pctChange, currentAmount: cat.thisMonthAmount, previousAmount: cat.lastMonthAmount });
    const id = cat.name.toLowerCase().replace(/\s+/g, '_') + '_spending_decrease';
    supportingSignals.push(id);
    supportingData.push({ label: `${cat.name} Spending`, value: `${cat.pctChange}%` });
  }

  // Logging consistency — derived from computeTrendContext activeDaysThisMonth
  let consistencySignal = null;
  if (consistency?.activeDaysThisMonth != null) {
    const days = consistency.activeDaysThisMonth;
    const level = days >= 20 ? 'excellent'
      : days >= 10 ? 'strong'
      : days >= 3 ? 'building'
      : days >= 1 ? 'getting started'
      : 'none';
    consistencySignal = { activeDays: days, level };
  }

  // Goal signals — requires enriched goal with forecast attached by API routes
  const goalSignals = [];
  for (const g of (goals || [])) {
    if (!g) continue;
    const forecastMonths = g.forecast?.projectedCompletionMonths ?? null;
    const forecastConfidence = g.forecast?.confidence ?? null;
    goalSignals.push({ title: g.title, progress: g.progressPercent ?? null, forecastMonths, forecastConfidence });
    if (forecastMonths != null && forecastMonths > 0) {
      supportingSignals.push('goal_forecast');
      supportingData.push({ label: `${g.title} Forecast`, value: `~${forecastMonths} months` });
    }
  }

  return {
    savingsRate: savingsRateSignal,
    spendingChanges,
    consistency: consistencySignal,
    goals: goalSignals,
    supportingSignals,
    supportingData,
  };
}
