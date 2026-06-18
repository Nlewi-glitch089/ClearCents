'use client';

export default function StrategyCard({ strategy }) {
  if (!strategy) return null;

  const { title, projectedBenefit, actionTitles = [], progress } = strategy;
  const annualBenefit = projectedBenefit?.annual ?? 0;

  return (
    <div className="card card--static">
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--accent)', marginBottom: 8 }}>
        Current Strategy
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
        {title}
      </div>
      {annualBenefit > 0 && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
          Projected: +${Math.round(annualBenefit)}/year
        </div>
      )}
      {actionTitles.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Actions
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--muted)', fontSize: 13 }}>
            {actionTitles.map((t, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{t}</li>
            ))}
          </ul>
        </div>
      )}
      {progress && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Progress: {progress.completedActions} of {progress.totalActions} actions completed
          </div>
          <div style={{ background: 'var(--border-subtle)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
            <div style={{ background: 'var(--accent)', height: '100%', width: `${progress.percentComplete}%`, borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      )}
    </div>
  );
}
