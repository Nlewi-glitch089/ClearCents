'use client';

export default function ActionCenter({ actions = [], onComplete, onDismiss }) {
  const active = actions.filter(a => a.status === 'active');
  const completed = actions.filter(a => a.status === 'completed');

  if (active.length === 0 && completed.length === 0) return null;

  return (
    <div className="card card--static">
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>
        Action Center
      </div>

      {active.length > 0 && (
        <div style={{ marginBottom: completed.length > 0 ? 14 : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Active</div>
          {active.map(a => (
            <div key={a.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{a.title}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                Score: {a.priorityScore} · Accepted {new Date(a.acceptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {onComplete && (
                  <button
                    type="button"
                    className="btn"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => onComplete(a.id)}
                  >
                    Mark Complete
                  </button>
                )}
                {onDismiss && (
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => onDismiss(a.id)}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>Completed</div>
          {completed.map(a => (
            <div key={a.id} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--accent)' }}>✓</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
