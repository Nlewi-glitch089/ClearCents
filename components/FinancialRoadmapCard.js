'use client';

export default function FinancialRoadmapCard({ roadmap }) {
  if (!roadmap) return null;

  const { title, currentGoal, milestones = [], nextMilestone, projectedCompletionDate } = roadmap;
  const completedCount = milestones.filter(m => m.completed).length;

  if (!currentGoal && !nextMilestone && !projectedCompletionDate) return null;

  const completionLabel = projectedCompletionDate
    ? new Date(projectedCompletionDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="card card--static" style={{ borderColor: 'rgba(62,166,255,0.20)', background: 'linear-gradient(135deg, rgba(62,166,255,0.04), transparent)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--heading-blue)', marginBottom: 10 }}>
        Financial Roadmap
      </div>

      {title && (
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 10 }}>
          {title}
        </div>
      )}

      {currentGoal && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Current Stage</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{currentGoal.title}</div>
          {currentGoal.progressPercent > 0 && (
            <div style={{ marginTop: 6, background: 'var(--surface-2)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, currentGoal.progressPercent)}%`,
                  background: 'var(--heading-blue)',
                  borderRadius: 4,
                  transition: 'width 0.8s ease',
                }}
              />
            </div>
          )}
        </div>
      )}

      {milestones.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Milestones</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {milestones.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: m.completed ? 'var(--heading-blue)' : 'var(--surface-2)',
                  border: m.completed ? 'none' : '1px solid var(--border-subtle)',
                }} />
                <span style={{ fontSize: 12, color: m.completed ? 'var(--text-secondary)' : 'var(--muted)' }}>
                  {m.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
        {nextMilestone && (
          <div style={{ flex: 1, minWidth: 80 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Next Milestone</div>
            <div style={{ fontSize: 12, color: 'var(--heading-blue)', fontWeight: 600 }}>{nextMilestone.title}</div>
          </div>
        )}
        {completionLabel && (
          <div style={{ flex: 1, minWidth: 80 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Est. Completion</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{completionLabel}</div>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 80 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Progress</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{completedCount} of {milestones.length} milestones</div>
        </div>
      </div>
    </div>
  );
}
