export function getActiveActionIds(actions = []) {
  return actions.filter(a => a.status === 'active').map(a => a.actionId);
}

export function suppressActiveOpportunities(opportunities = [], activeActionIds = []) {
  if (!activeActionIds.length) return opportunities;
  return opportunities.filter(op => !activeActionIds.includes(op.id));
}

export function buildActionHistoryContext(actions = []) {
  const accepted = actions.filter(a => a.status === 'active').map(a => a.title);
  const completed = actions.filter(a => a.status === 'completed').map(a => a.title);
  const dismissed = actions.filter(a => a.status === 'dismissed').map(a => a.title);
  return { accepted, completed, dismissed };
}

export function computeActionSuccessRate(actions = []) {
  const accepted = actions.filter(a => ['active', 'completed', 'abandoned'].includes(a.status)).length;
  const completed = actions.filter(a => a.status === 'completed').length;
  const successRate = accepted > 0 ? Math.round((completed / accepted) * 100) : 0;
  return { accepted, completed, successRate };
}

export function buildCompletionAlerts(actions = []) {
  return actions
    .filter(a => a.status === 'completed')
    .map(a => ({
      id: `action_completed_${a.actionId}`,
      severity: 'high',
      tone: 'positive',
      title: 'Action completed',
      description: `Completed action: ${a.title}.`,
      signalId: 'action_completed',
    }));
}
