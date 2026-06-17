function parseInput(input) {
  if (!input) return null;
  if (typeof input === 'string') {
    try { return JSON.parse(input); } catch { return null; }
  }
  return input;
}

function extractSignals(insight) {
  const input = parseInput(insight?.input);
  return Array.isArray(input?.signals) ? input.signals : [];
}

function extractAlertIds(insight) {
  const input = parseInput(insight?.input);
  if (!Array.isArray(input?.alerts)) return [];
  return input.alerts.map(a => (typeof a === 'string' ? a : a.id)).filter(Boolean);
}

export function buildFinancialMemory({
  currentSignals = [],
  currentAlerts = [],
  previousInsights = [],
} = {}) {
  const historicalSignalSets = previousInsights.map(extractSignals);
  const historicalAlertSets = previousInsights.map(extractAlertIds);

  const currentAlertIds = currentAlerts.map(a => (typeof a === 'string' ? a : a.id));
  const allPrevAlertIds = new Set(historicalAlertSets.flat());
  const mostRecentPrevAlertIds = new Set(historicalAlertSets[0] || []);

  // Alert change detection
  const newlyTriggeredAlerts = currentAlertIds.filter(id => !allPrevAlertIds.has(id));
  const resolvedAlerts = [...mostRecentPrevAlertIds].filter(id => !currentAlertIds.includes(id));
  const ongoingAlerts = currentAlertIds.filter(id => mostRecentPrevAlertIds.has(id));

  // Recurring patterns: signal appears in current AND at least one previous cycle
  const allPrevSignals = new Set(historicalSignalSets.flat());
  const recurringPatterns = currentSignals.filter(id => allPrevSignals.has(id));

  // Directional pattern inference
  const improvingPatterns = [];
  const worseningPatterns = [];

  if (currentSignals.includes('savings_rate_improvement')) {
    improvingPatterns.push('savings_rate');
  } else if (currentSignals.includes('savings_rate_decline')) {
    worseningPatterns.push('savings_rate');
  }

  for (const signalId of currentSignals) {
    if (signalId.endsWith('_spending_decrease')) {
      const base = signalId.replace('_spending_decrease', '');
      if (historicalSignalSets.some(s => s.includes(`${base}_spending_increase`))) {
        improvingPatterns.push(`${base}_spend`);
      }
    } else if (signalId.endsWith('_spending_increase')) {
      const base = signalId.replace('_spending_increase', '');
      if (historicalSignalSets.some(s => s.includes(signalId))) {
        worseningPatterns.push(`${base}_spend`);
      }
    }
  }

  // Consecutive streaks: how many cycles in a row (including current) a signal has appeared
  const streaks = {};
  for (const signalId of currentSignals) {
    let count = 1;
    for (const set of historicalSignalSets) {
      if (set.includes(signalId)) count++;
      else break;
    }
    if (count > 1) streaks[signalId] = count;
  }

  // Deduplication: current signals are an exact match with the most recent previous cycle
  const mostRecentSet = historicalSignalSets[0] || [];
  const repeated =
    currentSignals.length > 0 &&
    mostRecentSet.length > 0 &&
    currentSignals.length === mostRecentSet.length &&
    currentSignals.every(id => mostRecentSet.includes(id));

  return {
    recurringPatterns,
    improvingPatterns,
    worseningPatterns,
    newlyTriggeredAlerts,
    resolvedAlerts,
    ongoingAlerts,
    streaks,
    repeated,
  };
}

export function computePatternStrength(signalId, previousInsights = []) {
  let occurrences = 0;
  for (const ins of previousInsights) {
    if (extractSignals(ins).includes(signalId)) occurrences++;
  }

  const recentSets = previousInsights.slice(0, 2).map(extractSignals);
  const absentRecently = recentSets.length > 0 && recentSets.every(s => !s.includes(signalId));

  const trend =
    occurrences === 0 ? 'none'
    : absentRecently ? 'improving'
    : occurrences >= 3 ? 'worsening'
    : 'recurring';

  const confidence =
    occurrences >= 4 ? 'high'
    : occurrences >= 2 ? 'medium'
    : occurrences >= 1 ? 'low'
    : 'none';

  return { signalId, occurrences, trend, confidence };
}
