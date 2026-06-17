const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

export function buildFinancialAlerts({ summary = null, trends = null, goals = [], signals = null } = {}) {
  const alerts = [];

  // Spending spikes — from signals.spendingChanges (increases only, threshold >= 25%)
  for (const sc of (signals?.spendingChanges || [])) {
    if (sc.pctChange >= 25) {
      const severity = sc.pctChange >= 50 ? 'high' : 'medium';
      alerts.push({
        id: sc.category.toLowerCase().replace(/\s+/g, '_') + '_spike',
        severity,
        tone: 'warning',
        title: `${sc.category} spending increased`,
        description: `${sc.category} spending rose ${sc.pctChange}% compared with last month.`,
        signalId: sc.category.toLowerCase().replace(/\s+/g, '_') + '_spending_increase',
      });
    }
  }

  // Savings rate alerts — from signals.savingsRate.delta
  if (signals?.savingsRate?.delta != null) {
    const delta = signals.savingsRate.delta;
    if (delta >= 10) {
      alerts.push({
        id: 'savings_improvement',
        severity: 'medium',
        tone: 'positive',
        title: 'Savings rate improved',
        description: `Your savings rate improved by ${delta} percentage points this month.`,
        signalId: 'savings_rate_improvement',
      });
    } else if (delta <= -20) {
      alerts.push({
        id: 'savings_decline',
        severity: 'high',
        tone: 'warning',
        title: 'Savings rate declined significantly',
        description: `Your savings rate dropped by ${Math.abs(delta)} percentage points this month.`,
        signalId: 'savings_rate_decline',
      });
    } else if (delta <= -10) {
      alerts.push({
        id: 'savings_decline',
        severity: 'medium',
        tone: 'warning',
        title: 'Savings rate declined',
        description: `Your savings rate dropped by ${Math.abs(delta)} percentage points this month.`,
        signalId: 'savings_rate_decline',
      });
    }
  }

  // Goal alerts — from enriched goals (must have milestones and status)
  for (const g of (goals || [])) {
    if (!g) continue;

    // Completed goal — highest priority, skip milestone check
    if (g.status === 'completed' || g.milestones?.completed) {
      alerts.push({
        id: 'goal_completed',
        severity: 'high',
        tone: 'positive',
        title: 'Goal achieved',
        description: `${g.title} completed.`,
        signalId: null,
      });
      continue;
    }

    // Milestone — show highest threshold currently reached
    if (g.milestones) {
      const m = g.milestones;
      const pct = m.reached75 ? 75 : m.reached50 ? 50 : m.reached25 ? 25 : null;
      if (pct != null) {
        alerts.push({
          id: 'goal_milestone',
          severity: 'medium',
          tone: 'positive',
          title: `${pct}% milestone reached`,
          description: `You've reached ${pct}% of your ${g.title} goal.`,
          signalId: null,
        });
      }
    }
  }

  alerts.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3));
  return { alerts: alerts.slice(0, 3) };
}
