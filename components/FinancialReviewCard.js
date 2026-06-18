'use client';

export default function FinancialReviewCard({ review }) {
  if (!review) return null;
  const { wins = [], concerns = [], completedActions = 0, activeStrategies = 0 } = review;
  if (wins.length === 0 && concerns.length === 0) return null;

  return (
    <div className="card card--static">
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>
        Financial Review
      </div>

      {wins.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--accent)', marginBottom: 6 }}>
            Wins
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {wins.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {concerns.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#f87171', marginBottom: 6 }}>
            Concerns
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {concerns.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {(completedActions > 0 || activeStrategies > 0) && (
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
          {completedActions > 0 && (
            <span>{completedActions} action{completedActions !== 1 ? 's' : ''} completed</span>
          )}
          {activeStrategies > 0 && (
            <span>{activeStrategies} active {activeStrategies !== 1 ? 'strategies' : 'strategy'}</span>
          )}
        </div>
      )}
    </div>
  );
}
