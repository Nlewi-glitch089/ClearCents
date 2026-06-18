'use client';

export default function TopOpportunity({ opportunity }) {
  if (!opportunity) return null;

  const isHigh = opportunity.impactScore >= 70;
  const isMedium = opportunity.impactScore >= 40;
  const impactLabel = isHigh ? 'HIGH IMPACT' : isMedium ? 'MEDIUM IMPACT' : 'LOW IMPACT';
  const accentColor = isHigh ? '#f87171' : isMedium ? 'var(--heading-blue)' : 'var(--muted)';
  const borderColor = isHigh ? 'rgba(248,113,113,0.22)' : isMedium ? 'rgba(62,166,255,0.18)' : 'var(--border-subtle)';
  const bgColor = isHigh ? 'linear-gradient(135deg, rgba(248,113,113,0.05), transparent)' : isMedium ? 'linear-gradient(135deg, rgba(62,166,255,0.04), transparent)' : 'transparent';

  return (
    <div className="card card--static" style={{ borderColor, background: bgColor }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: accentColor, marginBottom: 8 }}>
        Top Opportunity · {impactLabel}
      </div>
      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 6 }}>
        {opportunity.title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {opportunity.description}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 8 }}>
        <span>Impact score: <strong>{opportunity.impactScore}</strong></span>
        <span>·</span>
        <span>Confidence: {opportunity.confidence}</span>
      </div>
    </div>
  );
}
