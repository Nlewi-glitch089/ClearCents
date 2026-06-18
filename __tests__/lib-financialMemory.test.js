import { buildFinancialMemory, computePatternStrength } from '../lib/financialMemory.js';

function makeInsight({ signals = [], alerts = [] } = {}) {
  return {
    input: {
      signals,
      alerts: alerts.map(id => ({ id, severity: 'medium' })),
    },
  };
}

// ---------------------------------------------------------------------------
// Scenario A — New alert (first appearance)
// ---------------------------------------------------------------------------

test('Scenario A: alert not in any previous cycle → newlyTriggeredAlerts', () => {
  const result = buildFinancialMemory({
    currentSignals: [],
    currentAlerts: [{ id: 'food_spike', severity: 'medium' }],
    previousInsights: [],
  });
  expect(result.newlyTriggeredAlerts).toContain('food_spike');
});

test('Scenario A: newly triggered alert is not in ongoingAlerts', () => {
  const result = buildFinancialMemory({
    currentAlerts: [{ id: 'food_spike', severity: 'medium' }],
    previousInsights: [],
  });
  expect(result.ongoingAlerts).not.toContain('food_spike');
});

test('alert present in previous but absent in current is NOT newly triggered', () => {
  const result = buildFinancialMemory({
    currentAlerts: [],
    previousInsights: [makeInsight({ alerts: ['food_spike'] })],
  });
  expect(result.newlyTriggeredAlerts).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Scenario B — Ongoing alert
// ---------------------------------------------------------------------------

test('Scenario B: alert in current and most recent previous → ongoingAlerts', () => {
  const result = buildFinancialMemory({
    currentAlerts: [{ id: 'food_spike', severity: 'medium' }],
    previousInsights: [makeInsight({ alerts: ['food_spike'] })],
  });
  expect(result.ongoingAlerts).toContain('food_spike');
  expect(result.newlyTriggeredAlerts).not.toContain('food_spike');
});

test('ongoing alert persists across 3 cycles', () => {
  const prevInsights = [
    makeInsight({ alerts: ['food_spike'] }),
    makeInsight({ alerts: ['food_spike'] }),
    makeInsight({ alerts: ['food_spike'] }),
  ];
  const result = buildFinancialMemory({
    currentAlerts: [{ id: 'food_spike', severity: 'medium' }],
    previousInsights: prevInsights,
  });
  expect(result.ongoingAlerts).toContain('food_spike');
});

// ---------------------------------------------------------------------------
// Scenario C — Resolved alert
// ---------------------------------------------------------------------------

test('Scenario C: alert in previous, not in current → resolvedAlerts', () => {
  const result = buildFinancialMemory({
    currentAlerts: [],
    previousInsights: [makeInsight({ alerts: ['food_spike'] })],
  });
  expect(result.resolvedAlerts).toContain('food_spike');
});

test('resolved alert is not in ongoingAlerts', () => {
  const result = buildFinancialMemory({
    currentAlerts: [],
    previousInsights: [makeInsight({ alerts: ['food_spike'] })],
  });
  expect(result.ongoingAlerts).not.toContain('food_spike');
});

test('alert in current but not in previous is not in resolvedAlerts', () => {
  const result = buildFinancialMemory({
    currentAlerts: [{ id: 'savings_decline', severity: 'high' }],
    previousInsights: [makeInsight({ alerts: [] })],
  });
  expect(result.resolvedAlerts).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Scenario D — Improving and worsening patterns
// ---------------------------------------------------------------------------

test('Scenario D: savings_rate_improvement in current → improvingPatterns contains savings_rate', () => {
  const result = buildFinancialMemory({
    currentSignals: ['savings_rate_improvement'],
  });
  expect(result.improvingPatterns).toContain('savings_rate');
  expect(result.worseningPatterns).not.toContain('savings_rate');
});

test('savings_rate_decline in current → worseningPatterns contains savings_rate', () => {
  const result = buildFinancialMemory({
    currentSignals: ['savings_rate_decline'],
  });
  expect(result.worseningPatterns).toContain('savings_rate');
  expect(result.improvingPatterns).not.toContain('savings_rate');
});

test('spending_decrease after prior spending_increase → improvingPatterns', () => {
  const result = buildFinancialMemory({
    currentSignals: ['food_spending_decrease'],
    previousInsights: [makeInsight({ signals: ['food_spending_increase'] })],
  });
  expect(result.improvingPatterns).toContain('food_spend');
});

test('spending_increase repeated → worseningPatterns', () => {
  const result = buildFinancialMemory({
    currentSignals: ['food_spending_increase'],
    previousInsights: [makeInsight({ signals: ['food_spending_increase'] })],
  });
  expect(result.worseningPatterns).toContain('food_spend');
});

// ---------------------------------------------------------------------------
// Scenario E — Insight deduplication
// ---------------------------------------------------------------------------

test('Scenario E: identical signals to previous cycle → repeated:true', () => {
  const result = buildFinancialMemory({
    currentSignals: ['food_spending_increase'],
    previousInsights: [makeInsight({ signals: ['food_spending_increase'] })],
  });
  expect(result.repeated).toBe(true);
});

test('different signals from previous cycle → repeated:false', () => {
  const result = buildFinancialMemory({
    currentSignals: ['savings_rate_improvement'],
    previousInsights: [makeInsight({ signals: ['food_spending_increase'] })],
  });
  expect(result.repeated).toBe(false);
});

test('no previous insights → repeated:false', () => {
  const result = buildFinancialMemory({
    currentSignals: ['food_spending_increase'],
    previousInsights: [],
  });
  expect(result.repeated).toBe(false);
});

test('current signals are superset of previous → repeated:false', () => {
  const result = buildFinancialMemory({
    currentSignals: ['food_spending_increase', 'savings_rate_improvement'],
    previousInsights: [makeInsight({ signals: ['food_spending_increase'] })],
  });
  expect(result.repeated).toBe(false);
});

// ---------------------------------------------------------------------------
// recurringPatterns
// ---------------------------------------------------------------------------

test('signal in both current and previous → recurringPatterns', () => {
  const result = buildFinancialMemory({
    currentSignals: ['food_spending_increase'],
    previousInsights: [makeInsight({ signals: ['food_spending_increase'] })],
  });
  expect(result.recurringPatterns).toContain('food_spending_increase');
});

test('signal only in current, not previous → not in recurringPatterns', () => {
  const result = buildFinancialMemory({
    currentSignals: ['savings_rate_improvement'],
    previousInsights: [makeInsight({ signals: [] })],
  });
  expect(result.recurringPatterns).not.toContain('savings_rate_improvement');
});

// ---------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------

test('signal in current and 2 previous cycles → streak of 3', () => {
  const result = buildFinancialMemory({
    currentSignals: ['savings_rate_improvement'],
    previousInsights: [
      makeInsight({ signals: ['savings_rate_improvement'] }),
      makeInsight({ signals: ['savings_rate_improvement'] }),
    ],
  });
  expect(result.streaks['savings_rate_improvement']).toBe(3);
});

test('signal absent in most recent previous cycle breaks streak', () => {
  const result = buildFinancialMemory({
    currentSignals: ['savings_rate_improvement'],
    previousInsights: [
      makeInsight({ signals: [] }),
      makeInsight({ signals: ['savings_rate_improvement'] }),
    ],
  });
  expect(result.streaks['savings_rate_improvement']).toBeUndefined();
});

test('signal only in current cycle → no streak entry', () => {
  const result = buildFinancialMemory({
    currentSignals: ['savings_rate_improvement'],
    previousInsights: [],
  });
  expect(result.streaks['savings_rate_improvement']).toBeUndefined();
});

// ---------------------------------------------------------------------------
// computePatternStrength
// ---------------------------------------------------------------------------

test('computePatternStrength: 0 occurrences → trend:none, confidence:none', () => {
  const result = computePatternStrength('food_spending_increase', [
    makeInsight({ signals: [] }),
    makeInsight({ signals: [] }),
  ]);
  expect(result.occurrences).toBe(0);
  expect(result.trend).toBe('none');
  expect(result.confidence).toBe('none');
});

test('computePatternStrength: 1 occurrence, absent recently → trend:improving, confidence:low', () => {
  const result = computePatternStrength('food_spending_increase', [
    makeInsight({ signals: [] }),
    makeInsight({ signals: [] }),
    makeInsight({ signals: ['food_spending_increase'] }),
  ]);
  expect(result.occurrences).toBe(1);
  expect(result.trend).toBe('improving');
  expect(result.confidence).toBe('low');
});

test('computePatternStrength: 2 occurrences → confidence:medium', () => {
  const result = computePatternStrength('food_spending_increase', [
    makeInsight({ signals: ['food_spending_increase'] }),
    makeInsight({ signals: ['food_spending_increase'] }),
  ]);
  expect(result.occurrences).toBe(2);
  expect(result.confidence).toBe('medium');
});

test('computePatternStrength: 3 occurrences, recent present → trend:worsening', () => {
  const result = computePatternStrength('food_spending_increase', [
    makeInsight({ signals: ['food_spending_increase'] }),
    makeInsight({ signals: ['food_spending_increase'] }),
    makeInsight({ signals: ['food_spending_increase'] }),
  ]);
  expect(result.trend).toBe('worsening');
});

test('computePatternStrength: returns signalId in result', () => {
  const result = computePatternStrength('savings_rate_improvement', []);
  expect(result.signalId).toBe('savings_rate_improvement');
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

test('empty input → no crash, empty arrays', () => {
  const result = buildFinancialMemory();
  expect(result.newlyTriggeredAlerts).toEqual([]);
  expect(result.resolvedAlerts).toEqual([]);
  expect(result.recurringPatterns).toEqual([]);
  expect(result.improvingPatterns).toEqual([]);
  expect(result.worseningPatterns).toEqual([]);
  expect(result.ongoingAlerts).toEqual([]);
  expect(result.repeated).toBe(false);
});

test('stringified input in previousInsights is parsed correctly', () => {
  const result = buildFinancialMemory({
    currentAlerts: [{ id: 'food_spike', severity: 'medium' }],
    previousInsights: [
      { input: JSON.stringify({ signals: [], alerts: [{ id: 'food_spike', severity: 'medium' }] }) },
    ],
  });
  expect(result.ongoingAlerts).toContain('food_spike');
});

test('null previousInsight entries are handled gracefully', () => {
  const result = buildFinancialMemory({
    currentSignals: ['savings_rate_improvement'],
    previousInsights: [null, makeInsight({ signals: ['savings_rate_improvement'] })],
  });
  expect(result).toBeDefined();
  expect(Array.isArray(result.recurringPatterns)).toBe(true);
});
