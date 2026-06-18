export function buildFinancialReview({
  summary = null,
  signals = null,
  alerts = [],
  memory = null,
  actions = [],
  strategies = [],
  period = 'monthly',
  roadmap = null,
} = {}) {
  const wins = [];
  const concerns = [];

  // Savings rate improvement → win
  if (signals?.supportingSignals?.includes('savings_rate_improvement')) {
    wins.push('Savings rate improved');
  }

  // Improving memory patterns → wins (avoid duplicating savings rate)
  for (const p of (memory?.improvingPatterns || [])) {
    const label = p === 'savings_rate' ? 'Savings rate' : p.replace(/_/g, ' ');
    if (!wins.some(w => w.toLowerCase().includes(label.toLowerCase()))) {
      wins.push(`${label} improving`);
    }
  }

  // Category spending decreases → wins
  for (const change of (signals?.spendingChanges || [])) {
    if (change.pctChange < 0) {
      wins.push(`${change.category} spending decreased`);
    }
  }

  // Resolved alerts → wins
  for (const id of (memory?.resolvedAlerts || [])) {
    wins.push(`Previous concern resolved: ${id.replace(/_/g, ' ')}`);
  }

  // Logging consistency (weekly period only)
  if (period === 'weekly') {
    const activeDays = signals?.consistency?.activeDays;
    if (activeDays != null && activeDays >= 5) {
      wins.push(`Logged expenses on ${activeDays} days`);
    }
  }

  // Non-positive alerts → concerns; track keywords to avoid duplicate spending concerns
  const coveredKeywords = new Set();
  for (const alert of (alerts || [])) {
    if (alert.tone !== 'positive') {
      concerns.push(alert.description);
      const words = (alert.description || '').toLowerCase().split(/\s+/);
      for (const w of words) {
        if (w.length > 4) coveredKeywords.add(w);
      }
    }
  }

  // Category spending increases → concerns (skip if alert already covers it)
  for (const change of (signals?.spendingChanges || [])) {
    if (change.pctChange > 0) {
      const catKey = change.category.toLowerCase();
      const alreadyCovered = [...coveredKeywords].some(k => catKey.includes(k) || k.includes(catKey));
      if (!alreadyCovered) {
        concerns.push(`${change.category} spending increased`);
      }
    }
  }

  // Worsening memory patterns → concerns
  for (const p of (memory?.worseningPatterns || [])) {
    const label = p.replace(/_/g, ' ');
    if (!concerns.some(c => c.toLowerCase().includes(label.toLowerCase()))) {
      concerns.push(`${label} is worsening`);
    }
  }

  // completedActions: count FinancialAction records with status 'completed'
  const completedActions = (actions || []).filter(a => a.status === 'completed').length;

  // activeStrategies: strategies not yet at 100% completion
  const activeStrategies = (strategies || []).filter(s =>
    !s.progress || s.progress.percentComplete < 100
  ).length;

  // topOpportunity: largest spending increase category or first non-positive alert title
  let topOpportunity = null;
  const topIncrease = (signals?.spendingChanges || [])
    .filter(c => c.pctChange > 0)
    .sort((a, b) => b.pctChange - a.pctChange)[0] || null;
  if (topIncrease) {
    topOpportunity = `Reduce ${topIncrease.category.toLowerCase()} spending`;
  } else {
    const nonPositive = (alerts || []).find(a => a.tone !== 'positive');
    if (nonPositive) topOpportunity = nonPositive.title || null;
  }

  // Roadmap milestone progress for review integration
  let roadmapProgress = null;
  if (roadmap) {
    const milestones = roadmap.milestones || [];
    const lastCompleted = [...milestones].reverse().find(m => m.completed) || null;
    const nextMilestone = milestones.find(m => !m.completed) || null;
    roadmapProgress = {
      completedMilestone: lastCompleted?.title || null,
      upcomingMilestone: nextMilestone?.title || null,
    };
  }

  return {
    period,
    wins,
    concerns,
    completedActions,
    activeStrategies,
    topOpportunity,
    roadmapProgress,
  };
}

export function generateFinancialReview({
  summary = null,
  signals = null,
  alerts = [],
  memory = null,
  actions = [],
  strategies = [],
  period = 'monthly',
  roadmap = null,
} = {}) {
  const review = buildFinancialReview({ summary, signals, alerts, memory, actions, strategies, period, roadmap });
  return {
    wins: review.wins,
    concerns: review.concerns,
    actions: (actions || [])
      .filter(a => a.status === 'active' || a.status === 'completed')
      .map(a => ({ id: a.id || a.actionId, title: a.title, status: a.status })),
    opportunities: review.topOpportunity ? [review.topOpportunity] : [],
    strategies: (strategies || []).map(s => ({
      id: s.id,
      title: s.title,
      progress: s.progress || null,
    })),
  };
}

export function computeReviewProgress(currentReview = {}, previousReview = {}) {
  const prevConcerns = previousReview?.concerns || [];
  if (prevConcerns.length === 0) return { resolved: false };
  const currConcerns = currentReview?.concerns || [];
  const resolved = prevConcerns.some(prevConcern => {
    const keyword = prevConcern.split(' ').find(w => w.length > 3) || prevConcern.split(' ')[0] || '';
    return !currConcerns.some(c => c.toLowerCase().includes(keyword.toLowerCase()));
  });
  return { resolved };
}
