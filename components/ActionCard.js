'use client';

export default function ActionCard({ action, onAccept, onDismiss }) {
  if (!action) return null;

  const priorityLabel = action.priorityScore >= 70 ? 'HIGH' : action.priorityScore >= 40 ? 'MEDIUM' : 'LOW';
  const priorityColor = action.priorityScore >= 70 ? '#f87171' : action.priorityScore >= 40 ? 'var(--heading-blue)' : 'var(--muted)';
  const annualBenefit = action.estimatedMonthlyBenefit > 0 ? action.estimatedMonthlyBenefit * 12 : null;

  return (
    <div className="card card--static">
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: priorityColor, marginBottom: 6 }}>
        {priorityLabel} PRIORITY · Recommended Action
      </div>
      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
        {action.title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: annualBenefit ? 6 : 10, lineHeight: 1.5 }}>
        {action.description}
      </div>
      {annualBenefit && (
        <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 10 }}>
          Estimated benefit: ${annualBenefit}/year
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
        <span>Difficulty: {action.difficulty.charAt(0).toUpperCase() + action.difficulty.slice(1)}</span>
        <span>·</span>
        <span>Score: {action.priorityScore}</span>
      </div>
      {(onAccept || onDismiss) && (
        <div style={{ display: 'flex', gap: 8 }}>
          {onAccept && (
            <button
              type="button"
              className="btn"
              style={{ fontSize: 12, padding: '5px 12px' }}
              onClick={() => onAccept(action)}
            >
              Accept
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              className="btn ghost"
              style={{ fontSize: 12, padding: '5px 12px' }}
              onClick={() => onDismiss(action.id)}
            >
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
}
