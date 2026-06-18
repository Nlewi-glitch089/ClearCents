'use client';

const TONE_STYLES = {
  warning: {
    badge: { background: 'rgba(248,113,113,0.12)', color: '#f87171' },
  },
  positive: {
    badge: { background: 'rgba(16,192,138,0.12)', color: 'var(--accent)' },
  },
};

export default function FinancialAlerts({ alerts = [] }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="card card--static" style={{ borderColor: 'rgba(62,166,255,0.18)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 12 }}>
        Financial Alerts
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alerts.map((alert, idx) => {
          const toneStyle = TONE_STYLES[alert.tone] || TONE_STYLES.positive;
          return (
            <div
              key={alert.id + idx}
              style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                paddingTop: idx > 0 ? 10 : 0,
                borderTop: idx > 0 ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              <div style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px',
                padding: '2px 5px', borderRadius: 3, flexShrink: 0, marginTop: 2,
                ...toneStyle.badge,
              }}>
                {alert.severity}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {alert.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginTop: 1 }}>
                  {alert.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
