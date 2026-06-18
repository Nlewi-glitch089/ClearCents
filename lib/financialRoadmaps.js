function buildMilestones(goal) {
  const pct = Number(goal?.progressPercent || 0);
  return [
    { id: 'save_25', title: 'Reach 25%', completed: pct >= 25 },
    { id: 'save_50', title: 'Reach 50%', completed: pct >= 50 },
    { id: 'save_75', title: 'Reach 75%', completed: pct >= 75 },
    { id: 'save_100', title: 'Goal Complete', completed: pct >= 100 },
  ];
}

export function buildFinancialRoadmap({ goals = [], strategies = [], actions = [], reviews = [] } = {}) {
  // Sort: active first, then archived, completed last
  const statusOrder = { active: 0, archived: 1, completed: 2 };
  const sorted = [...goals].sort((a, b) =>
    (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1)
  );

  const primary = sorted[0] || null;
  if (!primary) return { roadmap: null };

  const milestones = buildMilestones(primary);
  const nextMilestone = milestones.find(m => !m.completed) || null;
  const projectedCompletionDate = primary.forecast?.projectedCompletionDate || null;
  const goalOrder = sorted.map(g => g.id);

  return {
    roadmap: {
      title: `${primary.title} Plan`,
      milestones,
      projectedCompletionDate,
      goalOrder,
      currentGoal: {
        id: primary.id,
        title: primary.title,
        progressPercent: primary.progressPercent || 0,
      },
      nextMilestone,
    },
  };
}

export function buildRoadmapTimeline({ goal = null } = {}) {
  if (!goal) return [];

  const events = [];

  if (goal.createdAt) {
    events.push({
      date: new Date(goal.createdAt).toISOString().slice(0, 10),
      event: 'Goal created',
    });
  }

  const pct = Number(goal.progressPercent || 0);
  const createdMs = goal.createdAt ? new Date(goal.createdAt).getTime() : null;
  const ageMs = createdMs ? Date.now() - createdMs : 0;

  // Estimate past milestone dates using linear pace interpolation
  for (const threshold of [25, 50, 75, 100]) {
    if (pct >= threshold && createdMs && ageMs > 0) {
      const approxMs = ageMs * (threshold / pct);
      const approxDate = new Date(createdMs + approxMs);
      events.push({
        date: approxDate.toISOString().slice(0, 10),
        event: `Reached ${threshold}%`,
      });
    }
  }

  // Projected completion (only if goal not yet complete)
  if (goal.forecast?.projectedCompletionDate && pct < 100) {
    events.push({
      date: goal.forecast.projectedCompletionDate,
      event: 'Projected completion',
    });
  }

  return events.sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function computeRoadmapHealth({ forecast = null, strategies = [], actions = [], consistency = null } = {}) {
  let score = 0;

  // Forecast confidence: up to 35 pts
  if (forecast?.confidence === 'high') score += 35;
  else if (forecast?.confidence === 'medium') score += 20;
  else if (forecast?.confidence === 'low') score += 10;

  // Strategy progress: up to 25 pts
  const withProgress = (strategies || []).filter(s => s.progress);
  if (withProgress.length > 0) {
    const allComplete = withProgress.every(s => s.progress.percentComplete >= 100);
    if (allComplete) {
      score += 25;
    } else {
      const avg = withProgress.reduce((s, st) => s + (st.progress?.percentComplete || 0), 0) / withProgress.length;
      score += Math.round((avg / 100) * 25);
    }
  } else if ((strategies || []).length > 0) {
    score += 25;
  }

  // Action completion: up to 20 pts
  const relevantActions = (actions || []).filter(a => a.status === 'active' || a.status === 'completed');
  if (relevantActions.length > 0) {
    const completed = (actions || []).filter(a => a.status === 'completed').length;
    score += Math.round((completed / relevantActions.length) * 20);
  }

  // Consistency: up to 20 pts
  const activeDays = consistency?.activeDays ?? consistency?.activeDaysThisMonth ?? 0;
  if (activeDays >= 20) score += 20;
  else if (activeDays >= 10) score += 12;
  else if (activeDays >= 3) score += 5;

  score = Math.min(100, Math.max(0, score));

  const status = score >= 75 ? 'ahead_of_schedule'
    : score >= 50 ? 'on_track'
    : 'at_risk';

  return { score, status };
}

export function buildRoadmapCompletionAlert(roadmap) {
  if (!roadmap) return null;
  const allCompleted = roadmap.milestones?.every(m => m.completed);
  if (!allCompleted) return null;
  return {
    id: 'roadmap_completed',
    severity: 'high',
    tone: 'positive',
    title: `${roadmap.title} completed.`,
    description: `${roadmap.title} completed.`,
    signalId: 'roadmap_completed',
  };
}
